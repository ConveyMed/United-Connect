import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FUNCTION_NAME = "physician-research";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestOrigin = req.headers.get("origin") || "";
  const userAgent = req.headers.get("user-agent") || "";
  const clientInfo = req.headers.get("x-client-info") || "";
  const clientPlatform = detectPlatform(requestOrigin, userAgent);
  const requestId = crypto.randomUUID();

  let loggerClient: ReturnType<typeof createClient> | null = null;
  let rawBodyForLog: unknown = null;

  const logError = async (payload: {
    stage: string;
    errorMessage: string;
    errorStack?: string;
    upstreamStatus?: number;
    upstreamBody?: string;
    extra?: Record<string, unknown>;
  }) => {
    console.error(
      `[${FUNCTION_NAME}] [${requestId}] stage=${payload.stage} platform=${clientPlatform} msg=${payload.errorMessage}`
    );
    if (!loggerClient) return;
    try {
      await loggerClient.from("function_error_logs").insert({
        function_name: FUNCTION_NAME,
        stage: payload.stage,
        error_message: payload.errorMessage,
        error_stack: payload.errorStack || null,
        request_origin: requestOrigin || null,
        user_agent: userAgent || null,
        client_platform: clientPlatform,
        request_body: rawBodyForLog == null ? null : rawBodyForLog,
        upstream_status: payload.upstreamStatus ?? null,
        upstream_body: payload.upstreamBody ?? null,
        extra: {
          request_id: requestId,
          x_client_info: clientInfo,
          ...(payload.extra || {}),
        },
      });
    } catch (logErr) {
      console.error(
        `[${FUNCTION_NAME}] [${requestId}] failed to persist error log:`,
        (logErr as Error).message
      );
    }
  };

  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify({ ...body, request_id: requestId }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      loggerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }

    const rawText = await req.text();
    try {
      rawBodyForLog = rawText ? JSON.parse(rawText) : null;
    } catch {
      rawBodyForLog = { __raw: rawText?.slice(0, 500) };
    }

    console.log(
      `[${FUNCTION_NAME}] [${requestId}] incoming platform=${clientPlatform} origin=${requestOrigin} bodyLen=${rawText.length}`
    );

    let surgeon_id: string | undefined;
    try {
      const parsed = rawText ? JSON.parse(rawText) : {};
      surgeon_id = parsed?.surgeon_id;
    } catch (parseErr) {
      await logError({
        stage: "parse_body",
        errorMessage: (parseErr as Error).message,
        extra: { raw_body_preview: rawText.slice(0, 200) },
      });
      return respond(200, {
        success: false,
        error: "Invalid request body. Please try again.",
        error_code: "INVALID_BODY",
      });
    }

    if (!surgeon_id) {
      await logError({
        stage: "validate_input",
        errorMessage: "surgeon_id missing from request body",
      });
      return respond(200, {
        success: false,
        error: "surgeon_id is required",
        error_code: "MISSING_SURGEON_ID",
      });
    }

    if (!GEMINI_API_KEY) {
      await logError({
        stage: "config",
        errorMessage: "GEMINI_API_KEY is not configured",
      });
      return respond(200, {
        success: false,
        error: "AI research is not configured on the server.",
        error_code: "MISSING_GEMINI_KEY",
      });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      await logError({
        stage: "config",
        errorMessage: "Supabase service credentials missing",
      });
      return respond(200, {
        success: false,
        error: "Server configuration error.",
        error_code: "MISSING_SUPABASE_CONFIG",
      });
    }

    const supabase = loggerClient ||
      createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: surgeon, error: surgeonError } = await supabase
      .from("surgeons")
      .select(
        "full_name, first_name, last_name, npi, specialty, city, state, hospital, site_of_care"
      )
      .eq("id", surgeon_id)
      .single();

    if (surgeonError || !surgeon) {
      await logError({
        stage: "fetch_surgeon",
        errorMessage: surgeonError?.message || `Surgeon not found: ${surgeon_id}`,
        extra: { surgeon_id },
      });
      return respond(200, {
        success: false,
        error: "Could not find that surgeon in the database.",
        error_code: "SURGEON_NOT_FOUND",
      });
    }

    const surgeonName =
      surgeon.full_name ||
      `${surgeon.first_name || ""} ${surgeon.last_name || ""}`.trim();
    const location = [surgeon.city, surgeon.state].filter(Boolean).join(", ");
    const institution = surgeon.hospital || "";

    console.log(
      `[${FUNCTION_NAME}] [${requestId}] researching surgeon=${surgeonName} location=${location}`
    );

    const prompt = buildPrompt(surgeonName, surgeon, institution, location);

    const callGemini = async (
      bodyPayload: Record<string, unknown>,
      label: string
    ) => {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      let resp: Response;
      try {
        resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });
      } catch (networkErr) {
        await logError({
          stage: `gemini_fetch_${label}`,
          errorMessage: (networkErr as Error).message,
          errorStack: (networkErr as Error).stack,
        });
        return null;
      }

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "<unreadable>");
        await logError({
          stage: `gemini_status_${label}`,
          errorMessage: `Gemini returned ${resp.status}`,
          upstreamStatus: resp.status,
          upstreamBody: errorText.slice(0, 2000),
        });
        return null;
      }

      let data: Record<string, unknown>;
      try {
        data = await resp.json();
      } catch (jsonErr) {
        await logError({
          stage: `gemini_parse_${label}`,
          errorMessage: (jsonErr as Error).message,
        });
        return null;
      }

      const text =
        (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
          ?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) {
        await logError({
          stage: `gemini_empty_${label}`,
          errorMessage: "Gemini returned no text",
          upstreamBody: JSON.stringify(data).slice(0, 2000),
        });
        return null;
      }

      try {
        let cleanText = text.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText
            .replace(/```json?\n?/g, "")
            .replace(/```/g, "")
            .trim();
        }
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { summary: cleanText };
      } catch (parseErr) {
        await logError({
          stage: `gemini_json_${label}`,
          errorMessage: (parseErr as Error).message,
          upstreamBody: text.slice(0, 1500),
        });
        return { summary: text.slice(0, 500) };
      }
    };

    const isUsableProfile = (data: Record<string, unknown> | null) => {
      if (!data) return false;
      const summary = String(data.summary || "").toLowerCase();
      if (!summary || summary.length < 20) return false;
      if (
        summary.includes("unable to generate") ||
        summary.includes("could not retrieve") ||
        summary.includes("cannot be generated") ||
        summary.includes("no factual information")
      ) {
        return false;
      }
      return true;
    };

    console.log(`[${FUNCTION_NAME}] [${requestId}] attempt 1: grounded`);
    let profileData = await callGemini(
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      },
      "grounded"
    );

    if (!isUsableProfile(profileData)) {
      console.log(`[${FUNCTION_NAME}] [${requestId}] attempt 2: fallback`);
      const fallbackPrompt = buildFallbackPrompt(
        surgeonName,
        surgeon,
        institution,
        location
      );

      profileData = await callGemini(
        {
          contents: [{ parts: [{ text: fallbackPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
        },
        "fallback"
      );

      if (!profileData) {
        await logError({
          stage: "both_attempts_failed",
          errorMessage: "Gemini grounded + fallback both failed",
        });
        return respond(200, {
          success: false,
          error:
            "Profile generation is temporarily unavailable. Please try again in a minute.",
          error_code: "GEMINI_UNAVAILABLE",
        });
      }

      profileData._source = "fallback_no_grounding";
    }

    const clean = (v: unknown) => {
      if (v == null) return null;
      if (typeof v === "string") {
        const t = v.trim().toLowerCase();
        if (t === "null" || t === "n/a" || t === "none" || t === "") return null;
      }
      return v as string;
    };

    const profileRow = {
      surgeon_id,
      summary: clean(profileData.summary),
      medical_school: clean(profileData.medical_school),
      residency: clean(profileData.residency),
      fellowship: clean(profileData.fellowship),
      research_interests: clean(profileData.research_interests),
      publications: clean(profileData.publications),
      healthgrades_score: clean(profileData.healthgrades_score),
      news_pr: clean(profileData.news_pr),
      ice_breakers: clean(profileData.ice_breakers),
      key_procedures: clean(profileData.key_procedures),
      clinical_specialties: clean(profileData.clinical_specialties),
      cms_url: clean(profileData.cms_url),
      source_url: clean(profileData.source_url),
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: upsertError } = await supabase
      .from("physician_profiles")
      .upsert(profileRow, { onConflict: "surgeon_id" })
      .select()
      .single();

    if (upsertError) {
      await logError({
        stage: "upsert_profile",
        errorMessage: upsertError.message,
        extra: { details: upsertError.details, hint: upsertError.hint },
      });
      return respond(200, {
        success: false,
        error: "Failed to save profile. Please try again.",
        error_code: "UPSERT_FAILED",
      });
    }

    console.log(
      `[${FUNCTION_NAME}] [${requestId}] success surgeon=${surgeonName}`
    );

    return respond(200, { success: true, profile });
  } catch (error) {
    await logError({
      stage: "uncaught",
      errorMessage: (error as Error).message,
      errorStack: (error as Error).stack,
    });
    return respond(200, {
      success: false,
      error: (error as Error).message || "Unexpected error.",
      error_code: "UNCAUGHT",
    });
  }
});

function detectPlatform(origin: string, ua: string) {
  const o = origin.toLowerCase();
  const u = ua.toLowerCase();
  if (o.startsWith("capacitor://") || o.startsWith("ionic://")) return "capacitor";
  if (u.includes("capacitor")) return "capacitor";
  if (u.includes("iphone") || u.includes("ipad") || u.includes("ios"))
    return "ios-web";
  if (u.includes("android")) return "android-web";
  if (o) return "web";
  return "unknown";
}

function buildPrompt(
  surgeonName: string,
  surgeon: Record<string, unknown>,
  institution: string,
  location: string
) {
  return `# Role
You are a Medical Sales Intelligence Agent. Your goal is to generate a concise "Pre-Call Flashcard" for a medical device sales representative. You focus on conversation starters, clinical pedigree, and high-value background intel.

# INPUTS
Physician Name: ${surgeonName}
${surgeon.npi ? `NPI: ${surgeon.npi}` : ""}
${surgeon.specialty ? `Medical Specialty: ${surgeon.specialty}` : ""}
${institution ? `Institution: ${institution}` : ""}
${location ? `City/Location: ${location}` : ""}

# Search Strategy
1. Identify the Target: Find the physician's official bio on their practice or hospital website.
2. Extract Education: specifically isolate Medical School, Residency, and Fellowship.
3. Identify "Hooks": Look for personal details in the bio (hobbies, hometown, sports), specific clinical interests (e.g., "anterior hip approach," "robotic surgery"), or recent research themes.
4. CMS Data: Generate the Open Payments search URL.

# Output Rules
- Format: Concise bullet points only. No long paragraphs.
- Content: Only include what a sales rep can use to build rapport or qualify the target.
- Only include verified, factual information.
- Use null for any field where information is not found.
- Do not fabricate or guess information.
- Keep each field to 1-2 short sentences max.

Respond in this exact JSON format:
{
  "summary": "2-3 sentence professional summary focused on what matters to a sales rep",
  "medical_school": "School name and graduation year if available",
  "residency": "Institution and program",
  "fellowship": "Institution and specialty if applicable",
  "clinical_specialties": "3-4 specific focus areas, e.g. Sports Medicine, Joint Replacement",
  "key_procedures": "Specific techniques mentioned, e.g. MAKO Robotics, Minimally Invasive Spine",
  "research_interests": "1-2 keywords on what they study",
  "ice_breakers": "Personal hobbies, community roles, fun facts, hometown, sports. If none found, use 'Standard professional bio only.'",
  "publications": "Notable publications or publication count",
  "healthgrades_score": "Healthgrades rating if available (e.g. 4.5/5)",
  "news_pr": "Any recent awards, unique leadership roles, or notable mentions",
  "cms_url": "https://openpaymentsdata.cms.gov/search",
  "source_url": "Link to the primary bio source used"
}`;
}

function buildFallbackPrompt(
  surgeonName: string,
  surgeon: Record<string, unknown>,
  institution: string,
  location: string
) {
  return `# Role
You are a Medical Sales Intelligence Agent. Generate a "Pre-Call Flashcard" using ONLY the data provided below. Do not search the web. Use your training knowledge to fill in what you can about this physician based on their name, NPI, and institution. If you cannot determine something with reasonable confidence, use null.

# INPUTS
Physician Name: ${surgeonName}
${surgeon.npi ? `NPI: ${surgeon.npi}` : ""}
${surgeon.specialty ? `Medical Specialty: ${surgeon.specialty}` : ""}
${institution ? `Institution: ${institution}` : ""}
${location ? `City/Location: ${location}` : ""}

# Output Rules
- Only include what you are reasonably confident about from training data.
- Use null for anything uncertain. Do not fabricate.
- Keep each field to 1-2 short sentences max.

Respond in this exact JSON format:
{
  "summary": "2-3 sentence professional summary. If limited info, describe what is known about their specialty and institution.",
  "medical_school": "School name if known, otherwise null",
  "residency": "Institution if known, otherwise null",
  "fellowship": "Institution and specialty if known, otherwise null",
  "clinical_specialties": "Based on their listed specialty and institution",
  "key_procedures": "Common procedures for their specialty if known",
  "research_interests": null,
  "ice_breakers": null,
  "publications": null,
  "healthgrades_score": null,
  "news_pr": null,
  "cms_url": "https://openpaymentsdata.cms.gov/search",
  "source_url": null
}`;
}
