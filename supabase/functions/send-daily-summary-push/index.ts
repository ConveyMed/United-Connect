// send-daily-summary-push
// Phase 4 of Field Intel Upgrades (Jun 2026).
//
// Cron'd HOURLY. For each user with call_log_notification_preference = 'daily_summary':
//   1. Compute their local time (using their profile.timezone if set, else America/Los_Angeles default).
//   2. If local hour is 8 (AM), count their unread call_logs and send ONE OneSignal push with the count.
//   3. Skip users whose local hour is not 8 — they'll be picked up by a later hourly run.
//
// Schedule: see scheduled_jobs.sql migration — pg_cron + pg_net invoking this function hourly.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_HOUR = 8; // 8 AM local

const localHour = (timezone: string | null): number => {
  try {
    const tz = timezone || "America/Los_Angeles";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour")?.value;
    return h ? parseInt(h, 10) : -1;
  } catch {
    return -1;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) throw new Error("OneSignal config missing");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. All users opted into daily_summary with a OneSignal player_id.
    const { data: subscribers, error: subErr } = await supabase
      .from("user_notification_preferences")
      .select("user_id, onesignal_player_id")
      .eq("call_log_notification_preference", "daily_summary")
      .not("onesignal_player_id", "is", null);
    if (subErr) throw subErr;
    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch timezones in one query.
    const userIds = subscribers.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from("users")
      .select("id, timezone")
      .in("id", userIds);
    const tzMap: Record<string, string | null> = {};
    (profiles || []).forEach((p) => {
      tzMap[p.id] = p.timezone || null;
    });

    // 3. Keep only those whose local hour is the target (8 AM).
    const eligible = subscribers.filter((s) => localHour(tzMap[s.user_id]) === TARGET_HOUR);
    if (eligible.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no users at target hour" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. For each, count unread call_logs (visible call_logs - their own - already read).
    let sentCount = 0;
    for (const sub of eligible) {
      // Visible call_logs not authored by user.
      const { data: visible } = await supabase
        .from("call_logs")
        .select("id")
        .neq("user_id", sub.user_id)
        .limit(500);
      const visibleIds = (visible || []).map((c) => c.id);
      if (visibleIds.length === 0) continue;

      const { data: reads } = await supabase
        .from("field_intel_notification_reads")
        .select("call_log_id")
        .eq("user_id", sub.user_id)
        .in("call_log_id", visibleIds);
      const readSet = new Set((reads || []).map((r) => r.call_log_id));
      const unreadCount = visibleIds.filter((id) => !readSet.has(id)).length;
      if (unreadCount === 0) continue;

      const notification = {
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [sub.onesignal_player_id],
        headings: { en: "Field Intel - daily summary" },
        contents: { en: `${unreadCount} new call log update${unreadCount === 1 ? "" : "s"} waiting.` },
        url: "/field-intel/activity",
        data: { type: "call_log_daily_summary", unread_count: String(unreadCount) },
      };
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(notification),
      });
      sentCount += 1;
    }

    return new Response(JSON.stringify({ sent: sentCount, eligible: eligible.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-daily-summary-push] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
