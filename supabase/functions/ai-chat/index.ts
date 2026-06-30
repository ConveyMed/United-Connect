import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback used when app_settings.ai_chat_config row is missing or unreadable.
// To change the prompt for a deployed app, UPDATE the ai_chat_config row in app_settings — do NOT edit this constant.
const DEFAULT_AI_CONFIG = {
  model: "gemini-2.5-flash",
  temperature: 0.3,
  max_tokens: 4096,
  prompt_template: `You are a medical device product expert assistant. Answer questions about products using ONLY the provided documentation. Be accurate and cite specific information.

## Product Documentation for {{product}}:
{{doc_content}}
{{conversation_context}}
## User Question:
{{question}}

## Instructions:
1. Answer the question using ONLY information from the documentation above
2. Be concise but thorough
3. If this is a follow-up question, use the previous conversation context to understand what the user is asking about
4. If the answer is not in the documentation, say "I couldn't find this information in the product documentation."
5. IMPORTANT: If the user makes an incorrect statement, seems confused about the procedure, or is not following the documented order of operations, politely correct them. Take a step back, clarify the misunderstanding, and provide the CORRECT order of operations with specific steps from the documentation.
6. You may use markdown formatting for better readability (bold with **, numbered lists, bullet points).

## Finding the Reference:
The documentation contains page markers formatted as "## Page X" or "## Page X-Y" (for page ranges). Under each page marker, there are section headers formatted as "### Section Title". Find the page marker and section header closest to where you found the answer.

IMPORTANT: PREFER citing from Surgical Technique sections or Product Brochure over FAQ/Q&A sections. If the same information appears in both, cite the Surgical Technique. Only cite FAQ/Q&A if that's the only place the information exists. If found only in FAQ, use sectionTitle: "FAQ #X" and pageNumber: "FAQ Section".

## Confidence levels:
- high = exact quote or near-exact match found
- medium = paraphrased from documentation
- low = inferred but not explicitly stated
- none = not found in documentation

Respond in this exact JSON format:
{
  "answer": "Your detailed answer here",
  "sectionTitle": "2.6.2 Step 1 – Trajectory K-wire",
  "pageNumber": "Page 10",
  "documentUrl": "https://example.com/document.pdf",
  "confidence": "high"
}

Example response for a K-wire trajectory question:
{
  "answer": "The recommended trajectory for the thumb metacarpal K-wire is oblique at 45 degrees, exiting in the intermetacarpal space to achieve bi-cortical engagement.",
  "sectionTitle": "2.6.2 Step 1 – Trajectory K-wire",
  "pageNumber": "Page 10",
  "documentUrl": "https://fieldorthopaedics.com/hubfs/Griplasty/Griplasty%20Surgical%20Tech%20V2%20FINAL_18092024.pdf",
  "confidence": "high"
}

Example response when not found:
{
  "answer": "I couldn't find this information in the product documentation.",
  "sectionTitle": null,
  "pageNumber": null,
  "documentUrl": null,
  "confidence": "none"
}`,
};

let configCache: { config: typeof DEFAULT_AI_CONFIG; cachedAt: number } | null = null;
const CONFIG_CACHE_TTL_MS = 60_000;

async function getAiConfig(supabase: ReturnType<typeof createClient>) {
  if (configCache && Date.now() - configCache.cachedAt < CONFIG_CACHE_TTL_MS) {
    return configCache.config;
  }
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_chat_config")
    .maybeSingle();

  if (error) {
    console.warn("ai_chat_config fetch error, using defaults:", error.message);
    return DEFAULT_AI_CONFIG;
  }
  if (!data?.value) {
    console.warn("ai_chat_config row missing, using defaults");
    return DEFAULT_AI_CONFIG;
  }
  const merged = { ...DEFAULT_AI_CONFIG, ...data.value };
  configCache = { config: merged, cachedAt: Date.now() };
  return merged;
}

function renderPromptTemplate(
  template: string,
  vars: { product: string; doc_content: string; conversation_context: string; question: string }
) {
  return template
    .replaceAll("{{product}}", vars.product)
    .replaceAll("{{doc_content}}", vars.doc_content)
    .replaceAll("{{conversation_context}}", vars.conversation_context)
    .replaceAll("{{question}}", vars.question);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { product, question, conversationHistory = [] } = await req.json();
    console.log("Received - Product:", product, "Question:", question, "History length:", conversationHistory.length);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch product document
    console.log("Fetching product doc for:", product);
    const { data: productDoc, error: dbError } = await supabase
      .from("product_docs")
      .select("*")
      .eq("product_name", product)
      .single();

    if (dbError || !productDoc) {
      console.error("Database error:", dbError);
      throw new Error(`Product documentation not found for: ${product}`);
    }

    console.log("Found product doc, content length:", productDoc.content?.length);

    // Build conversation context if there's history
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n## Previous Conversation:\n';
      for (const msg of conversationHistory) {
        if (msg.role === 'user') {
          conversationContext += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          conversationContext += `Assistant: ${msg.content}\n`;
        }
      }
      conversationContext += '\n';
    }

    // Load AI config from app_settings (with 60s cache + fallback to DEFAULT_AI_CONFIG)
    const aiConfig = await getAiConfig(supabase);

    // Build prompt by substituting placeholders into the template
    const prompt = renderPromptTemplate(aiConfig.prompt_template, {
      product,
      doc_content: productDoc.content || "",
      conversation_context: conversationContext,
      question,
    });

    // Call Gemini API
    console.log("Calling Gemini API with model:", aiConfig.model);
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: aiConfig.temperature,
            maxOutputTokens: aiConfig.max_tokens,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini response received");

    // Extract the text response
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Raw response:", responseText);

    // Try to parse JSON from response
    let parsedResponse;
    try {
      // Clean up markdown code blocks if present
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }

      // Find JSON in the response
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = { answer: cleanText, sectionTitle: null, pageNumber: null, confidence: "medium" };
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Try to extract answer field manually if JSON is malformed
      const answerMatch = responseText.match(/"answer"\s*:\s*"([^"]+(?:\\.[^"]*)*)/);
      const sectionMatch = responseText.match(/"sectionTitle"\s*:\s*"([^"]+)/);
      const pageMatch = responseText.match(/"pageNumber"\s*:\s*"([^"]+)/);

      parsedResponse = {
        answer: answerMatch ? answerMatch[1].replace(/\\"/g, '"') : responseText,
        sectionTitle: sectionMatch ? sectionMatch[1] : null,
        pageNumber: pageMatch ? pageMatch[1] : null,
        confidence: "medium"
      };
    }

    // Clean up section title (remove markdown ### prefix if present)
    let sectionTitle = parsedResponse.sectionTitle || null;
    if (sectionTitle) {
      sectionTitle = sectionTitle.replace(/^#+\s*/, '').trim();
    }

    // Build formatted response
    const formattedResponse = {
      success: true,
      product: product,
      question: question,
      answer: parsedResponse.answer,
      sourceUrl: parsedResponse.documentUrl || productDoc.source_url || null,
      sourceLabel: product,
      sectionTitle: sectionTitle,
      pageNumber: parsedResponse.pageNumber || null,
      confidence: parsedResponse.confidence || "medium",
      disclaimer: "Educational only — not medical advice. Consult a qualified clinician for patient-specific decisions.",
    };

    console.log("Returning formatted response");

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
