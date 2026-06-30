import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message, app_name } = await req.json();

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Name, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appLabel = app_name || "ConveyMed App";
    const subjectLine = subject || `Support Request from ${name}`;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Store in support_requests table
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/support_requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        name,
        email,
        subject: subjectLine,
        message,
        app_name: appLabel,
      }),
    });

    if (!insertRes.ok) {
      console.error("Insert failed:", await insertRes.text());
    }

    // Notify admins via OneSignal push
    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const onesignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (onesignalAppId && onesignalKey) {
      await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${onesignalKey}`,
        },
        body: JSON.stringify({
          app_id: onesignalAppId,
          included_segments: ["All"],
          headings: { en: `Support: ${appLabel}` },
          contents: { en: `${name}: ${message.substring(0, 100)}` },
          data: { type: "support_request" },
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Support contact error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to submit" }),
      { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  }
});
