// send-call-log-push
// Phase 4 of Field Intel Upgrades (Jun 2026).
//
// Invoked by the client immediately after a call_log INSERT succeeds.
// Looks up users assigned to the surgeon (via account_delegations) minus the author,
// filters those with call_log_notification_preference = 'per_log', sends OneSignal push.
//
// Daily-summary users are NOT pushed here — they're handled by send-daily-summary-push
// (separate cron'd function).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CallLogPushRequest {
  call_log_id: string;
  surgeon_id: string;
  author_user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: CallLogPushRequest = await req.json();

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) throw new Error("OneSignal config missing");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Surgeon name (for the push body).
    const { data: surgeon } = await supabase
      .from("surgeons")
      .select("full_name, first_name, last_name")
      .eq("id", payload.surgeon_id)
      .maybeSingle();
    const surgeonName =
      surgeon?.full_name ||
      `${surgeon?.first_name || ""} ${surgeon?.last_name || ""}`.trim() ||
      "an account";

    // 2. Author name (for the push body).
    const { data: author } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", payload.author_user_id)
      .maybeSingle();
    const authorName = `${author?.first_name || ""} ${author?.last_name || ""}`.trim() || "A teammate";

    // 3. Find users directly assigned to this surgeon (account_delegations).
    const { data: delegations } = await supabase
      .from("account_delegations")
      .select("user_id")
      .eq("surgeon_id", payload.surgeon_id);

    const directIds = new Set((delegations || []).map((d) => d.user_id));

    // 4. Walk the hierarchy chain upward for each direct user so managers + VPs also notified.
    const allTargetIds = new Set<string>(directIds);
    const toFetch = [...directIds];
    const visited = new Set<string>();
    while (toFetch.length) {
      const batch = toFetch.splice(0, 500);
      const { data: parents } = await supabase
        .from("hierarchy_assignments")
        .select("user_id, parent_user_id")
        .in("user_id", batch);
      (parents || []).forEach((p) => {
        visited.add(p.user_id);
        if (p.parent_user_id && !visited.has(p.parent_user_id)) {
          allTargetIds.add(p.parent_user_id);
          toFetch.push(p.parent_user_id);
        }
      });
    }

    // 5. Exclude the author.
    allTargetIds.delete(payload.author_user_id);
    if (allTargetIds.size === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no targets" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Filter to users with per_log preference + a OneSignal player_id.
    const { data: prefs } = await supabase
      .from("user_notification_preferences")
      .select("user_id, onesignal_player_id")
      .in("user_id", [...allTargetIds])
      .eq("call_log_notification_preference", "per_log")
      .not("onesignal_player_id", "is", null);

    const playerIds = (prefs || []).map((p) => p.onesignal_player_id).filter(Boolean);
    if (playerIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no per_log subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Send to OneSignal v1 API.
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: `New activity on ${surgeonName}` },
      contents: { en: `${authorName} logged a call.` },
      url: `/field-intel/activity`,
      data: { type: "call_log", call_log_id: payload.call_log_id, surgeon_id: payload.surgeon_id },
    };

    const oneSignalRes = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });
    const oneSignalJson = await oneSignalRes.json();

    return new Response(
      JSON.stringify({ sent: playerIds.length, onesignal: oneSignalJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-call-log-push] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
