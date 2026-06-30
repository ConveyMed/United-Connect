const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

exports.handler = async (event) => {
  // Bunny sends POST requests for webhook events
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  console.log('[Webhook] Bunny event received:', JSON.stringify(payload));

  // Bunny webhook payload includes VideoGuid and Status
  const videoId = payload.VideoGuid;
  const bunnyStatus = payload.Status;

  if (!videoId) {
    console.log('[Webhook] No VideoGuid in payload, ignoring');
    return { statusCode: 200, body: 'OK' };
  }

  // Bunny status codes: 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
  let appStatus = null;
  if (bunnyStatus === 4) appStatus = 'ready';
  else if (bunnyStatus === 5) appStatus = 'error';

  // Only act on finished or error — ignore intermediate states
  if (!appStatus) {
    console.log('[Webhook] Intermediate status', bunnyStatus, '- ignoring');
    return { statusCode: 200, body: 'OK' };
  }

  console.log('[Webhook] Video', videoId, 'is now', appStatus);

  // Use service role key so we bypass RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Find the content item by bunny_video_id and update its status
  const { data: item, error: findError } = await supabase
    .from('content_items')
    .select('id, title, bunny_video_status')
    .eq('bunny_video_id', videoId)
    .single();

  if (findError || !item) {
    console.log('[Webhook] No content item found for video', videoId);
    return { statusCode: 200, body: 'OK' };
  }

  // Don't update if already at this status
  if (item.bunny_video_status === appStatus) {
    console.log('[Webhook] Already', appStatus, '- skipping');
    return { statusCode: 200, body: 'OK' };
  }

  // Update the status in Supabase
  const { error: updateError } = await supabase
    .from('content_items')
    .update({ bunny_video_status: appStatus })
    .eq('id', item.id);

  if (updateError) {
    console.error('[Webhook] Failed to update status:', updateError);
    return { statusCode: 500, body: 'DB update failed' };
  }

  console.log('[Webhook] Updated', item.title, 'to', appStatus);

  // Send push notification to admins when video is ready
  if (appStatus === 'ready') {
    await notifyAdmins(supabase, item.title);
  }

  return { statusCode: 200, body: 'OK' };
};

async function notifyAdmins(supabase, videoTitle) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.log('[Webhook] OneSignal not configured, skipping push');
    return;
  }

  // Get admin/owner user IDs
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .or('is_admin.eq.true,is_owner.eq.true');

  const adminIds = admins?.map(a => a.id) || [];
  if (!adminIds.length) {
    console.log('[Webhook] No admins found');
    return;
  }

  // Get their device subscription IDs
  const { data: devices } = await supabase
    .from('user_devices')
    .select('onesignal_subscription_id')
    .in('user_id', adminIds);

  const subscriptionIds = devices?.map(d => d.onesignal_subscription_id) || [];
  if (!subscriptionIds.length) {
    console.log('[Webhook] No admin devices registered');
    return;
  }

  console.log('[Webhook] Sending push to', subscriptionIds.length, 'admin devices');

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_subscription_ids: subscriptionIds,
        headings: { en: 'Video Ready' },
        contents: { en: `"${videoTitle || 'Untitled'}" has finished processing` },
        data: { type: 'video_ready' },
      }),
    });

    const result = await response.json();
    console.log('[Webhook] Push result - recipients:', result.recipients, 'id:', result.id);

    // Clean up stale devices
    const invalidIds = result.errors?.invalid_player_ids || [];
    if (invalidIds.length > 0) {
      for (const invalidId of invalidIds) {
        await supabase
          .from('user_devices')
          .delete()
          .eq('onesignal_subscription_id', invalidId);
      }
    }
  } catch (err) {
    console.error('[Webhook] Push send failed:', err);
  }
}
