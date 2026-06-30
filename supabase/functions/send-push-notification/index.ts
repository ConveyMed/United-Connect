import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  // Target the recipients with ONE of these (in priority order):
  external_user_ids?: string[]; // App user IDs -> delivered by OneSignal external_id (update-proof)
  user_ids?: string[];          // App user IDs -> preference-filtered here, then by external_id
  player_ids?: string[];        // Raw OneSignal subscription IDs (legacy fallback)
  exclude_user_id?: string;     // User to exclude (e.g., the sender)

  // Notification content
  title: string;
  message: string;
  url?: string;                 // Deep link URL

  // Notification type for preference checking
  notification_type:
    | 'new_post'
    | 'post_like'
    | 'post_comment'
    | 'comment_reply'
    | 'bookmarked_comment'
    | 'direct_message'
    | 'group_message'
    | 'chat_added'
    | 'chat_removed'
    | 'new_update'
    | 'new_event'
    | 'event_reminder'
    | 'new_user'
    | 'report';

  // Additional data to pass to app
  data?: Record<string, string>;
}

// Map notification types to preference column names
const preferenceMap: Record<string, string> = {
  'new_post': 'push_new_posts',
  'post_like': 'push_post_likes',
  'post_comment': 'push_post_comments',
  'comment_reply': 'push_comment_replies',
  'bookmarked_comment': 'push_bookmarked_comments',
  'direct_message': 'push_direct_messages',
  'group_message': 'push_group_messages',
  'chat_added': 'push_chat_added',
  'chat_removed': 'push_chat_removed',
  'new_update': 'push_new_updates',
  'new_event': 'push_new_events',
  'event_reminder': 'push_event_reminders',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: PushNotificationRequest = await req.json();
    console.log("Push notification request, type:", payload.notification_type);

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal configuration missing");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ---- Resolve the targeting fields for the OneSignal notification ----
    // Preferred path: target by external_id (= app user id). The app calls
    // OneSignal.login(userId), so OneSignal maps each external_id to that
    // user's CURRENT subscription(s). Targeting this way means push survives
    // app updates / reinstalls / new devices without ever storing or chasing
    // subscription IDs that change underneath us.
    let externalIds: string[] = [];
    let subscriptionIds: string[] = [];

    if (payload.external_user_ids && payload.external_user_ids.length > 0) {
      // Caller already applied preferences/targeting — send straight through.
      externalIds = [...new Set(
        payload.external_user_ids.filter(id => id && id !== payload.exclude_user_id)
      )];
    } else if (payload.user_ids && payload.user_ids.length > 0) {
      // Apply the per-type preference here, then target the survivors by id.
      const preferenceColumn = preferenceMap[payload.notification_type];
      let allowedUserIds = payload.user_ids.filter(id => id !== payload.exclude_user_id);

      if (preferenceColumn && allowedUserIds.length > 0) {
        const { data: prefs, error: prefError } = await supabase
          .from('user_notification_preferences')
          .select(`user_id, ${preferenceColumn}`)
          .in('user_id', allowedUserIds);

        if (prefError) {
          console.error("Error fetching preferences:", prefError);
          throw new Error("Failed to fetch user preferences");
        }

        // No row = opted in by default; only drop EXPLICIT false.
        const disabled = new Set(
          (prefs || []).filter(p => p[preferenceColumn] === false).map(p => p.user_id)
        );
        allowedUserIds = allowedUserIds.filter(id => !disabled.has(id));
      }
      externalIds = [...new Set(allowedUserIds)];
    } else if (payload.player_ids && payload.player_ids.length > 0) {
      // Legacy fallback: raw subscription IDs.
      subscriptionIds = [...new Set(payload.player_ids)];
    }

    if (externalIds.length === 0 && subscriptionIds.length === 0) {
      console.log("No recipients to send to");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No recipients to send to" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetCount = externalIds.length || subscriptionIds.length;
    console.log(`Sending push to ${targetCount} ${externalIds.length ? 'users (external_id)' : 'subscriptions'}`);

    // Build OneSignal notification (v1 API)
    const notification: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: payload.title },
      contents: { en: payload.message },
      ...(payload.url && { url: payload.url }),
      ...(payload.data && { data: payload.data }),
    };
    if (externalIds.length > 0) {
      notification.include_external_user_ids = externalIds;
      notification.channel_for_external_user_ids = "push";
    } else {
      notification.include_subscription_ids = subscriptionIds;
    }

    const onesignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    if (!onesignalResponse.ok) {
      const errorText = await onesignalResponse.text();
      console.error("OneSignal API error:", errorText);
      throw new Error(`OneSignal API error: ${onesignalResponse.status}`);
    }

    const onesignalData = await onesignalResponse.json();
    console.log("OneSignal notification sent, id:", onesignalData.id);

    return new Response(
      JSON.stringify({
        success: true,
        sent: targetCount,
        onesignal_id: onesignalData.id,
        result: onesignalData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
