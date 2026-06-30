import { supabase } from '../config/supabase';

// Push sends go through the send-push-notification edge function, which holds
// the OneSignal REST key server-side (and runs with verify_jwt off, so a stale
// or expired client session can't block a send). The client only resolves WHO
// to notify (by user id) and the edge function targets them by external_id —
// so push survives app updates / reinstalls without chasing subscription IDs.

// Helper: Get all user IDs except sender
const getAllUserIds = async (excludeUserId) => {
  const { data, error } = await supabase.from('users').select('id');
  if (error) {
    console.error('[Push] Error fetching users:', error);
    return [];
  }
  return data.map(u => u.id).filter(id => id !== excludeUserId);
};

// Helper: Resolve WHICH users should receive a notification, honoring the
// per-type preference. Returns USER IDs (not subscription IDs): delivery
// targets users by external_id, so OneSignal routes to each user's CURRENT
// device(s). That makes push survive app updates / reinstalls without chasing
// subscription IDs that change underneath us.
const getSubscriptionIds = async (userIds, preferenceColumn = null) => {
  if (!userIds.length) return [];
  if (!preferenceColumn) return [...new Set(userIds)];

  // A user with no preference row is opted-in by default (defaults are created
  // all-on at registration), so only drop users who EXPLICITLY set it to false.
  const { data: prefs, error: prefError } = await supabase
    .from('user_notification_preferences')
    .select(`user_id, ${preferenceColumn}`)
    .in('user_id', userIds);

  if (prefError) {
    console.error('[Push] Error fetching preferences:', prefError);
    return [];
  }

  const disabled = new Set(
    (prefs || []).filter(p => p[preferenceColumn] === false).map(p => p.user_id)
  );
  const eligibleUserIds = [...new Set(userIds.filter(id => !disabled.has(id)))];
  console.log('[Push]', eligibleUserIds.length, 'eligible users for', preferenceColumn || 'all');
  return eligibleUserIds;
};

// Legacy alias for backward compatibility
const getPlayerIds = getSubscriptionIds;

// Helper: Get subscription IDs for post comment notifications
// Implements complex logic: (watching) OR (global_pref=true AND NOT muted)
const getPostCommentSubscriptionIds = async (postId, excludeUserId) => {
  console.log('[Push] getPostCommentSubscriptionIds - postId:', postId, 'excludeUserId:', excludeUserId);

  // Step 1: Get ALL users except the commenter
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('id');

  if (usersError) {
    console.error('[Push] Error fetching users:', usersError);
    return [];
  }

  const allUserIds = allUsers
    .map(u => u.id)
    .filter(id => id !== excludeUserId);

  if (!allUserIds.length) {
    console.log('[Push] No users to notify (excluding commenter)');
    return [];
  }

  console.log('[Push] Total users (excluding commenter):', allUserIds.length);

  // Step 2: Get global preferences for push_post_comments
  const { data: prefs, error: prefsError } = await supabase
    .from('user_notification_preferences')
    .select('user_id, push_post_comments')
    .in('user_id', allUserIds);

  if (prefsError) {
    console.error('[Push] Error fetching preferences:', prefsError);
    return [];
  }

  // Build a map of user preferences (default is true if no row exists)
  const prefMap = {};
  allUserIds.forEach(id => { prefMap[id] = true; }); // default true
  (prefs || []).forEach(p => { prefMap[p.user_id] = p.push_post_comments; });

  // Step 3: Get per-post notification settings
  const { data: postSettings, error: settingsError } = await supabase
    .from('post_notification_settings')
    .select('user_id, is_muted, is_watching')
    .eq('post_id', postId)
    .in('user_id', allUserIds);

  if (settingsError) {
    console.error('[Push] Error fetching post settings:', settingsError);
    return [];
  }

  // Build a map of per-post settings
  const settingsMap = {};
  (postSettings || []).forEach(s => {
    settingsMap[s.user_id] = { isMuted: s.is_muted, isWatching: s.is_watching };
  });

  // Step 4: Apply the logic:
  // Send notification if: (is_watching) OR (global push_post_comments = true AND NOT muted)
  const eligibleUserIds = allUserIds.filter(userId => {
    const globalPref = prefMap[userId];
    const postSetting = settingsMap[userId] || { isMuted: false, isWatching: false };

    // If watching, always include (overrides global OFF)
    if (postSetting.isWatching) return true;

    // If muted, never include (overrides global ON)
    if (postSetting.isMuted) return false;

    // Otherwise, use global preference
    return globalPref;
  });

  console.log('[Push] Eligible users after filtering:', eligibleUserIds.length);

  // Return USER IDs — delivery targets them by external_id (update-proof).
  return [...new Set(eligibleUserIds)];
};

// Helper: Send push via the send-push-notification edge function.
// `recipientUserIds` is the resolved set of USER IDs to notify (preferences /
// watching / muted already applied above). The edge function targets them by
// external_id, so OneSignal delivers to each user's CURRENT device — push keeps
// working across app updates, reinstalls, and new devices with no ID chasing.
const sendPush = async (recipientUserIds, title, message, data = {}) => {
  console.log('[Push] sendPush called for', recipientUserIds.length, 'users');

  if (!recipientUserIds.length) {
    console.log('[Push] No recipients to send to');
    return { success: false, reason: 'no_recipients' };
  }

  try {
    const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        external_user_ids: recipientUserIds,
        title,
        message,
        notification_type: data.type || 'new_post',
        data,
      },
    });

    if (error) {
      console.error('[Push] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[Push] === SEND-PUSH RESULT ===');
    console.log('[Push] sent:', result?.sent, 'onesignal_id:', result?.onesignal_id);

    return { success: result?.success !== false, result };
  } catch (err) {
    console.error('[Push] Error:', err);
    return { success: false, error: err.message };
  }
};

// ========== Post Notification Helpers ==========

/**
 * Send notification for a new post
 */
export const notifyNewPost = async ({
  senderId,
  senderName,
  postId,
  postPreview,
  notifyPush = true,
}) => {
  console.log('[Push] notifyNewPost called');
  console.log('[Push] Sender ID (excluded):', senderId);

  if (!notifyPush) {
    console.log('[Push] Push disabled for this post');
    return { success: true, skipped: true };
  }

  // Get all users except sender
  const userIds = await getAllUserIds(senderId);
  console.log('[Push] Target user IDs:', userIds);

  // Get player IDs for users with push enabled for new posts
  const playerIds = await getPlayerIds(userIds, 'push_new_posts');
  console.log('[Push] After preference filter, subscription IDs:', playerIds);

  return sendPush(
    playerIds,
    `${senderName || 'Someone'} posted`,
    postPreview || 'Shared a new post',
    { post_id: postId, type: 'new_post' }
  );
};

/**
 * Send notification when a post is liked
 */
export const notifyPostLiked = async ({
  senderId,
  senderName,
  postId,
  postAuthorId,
}) => {
  console.log('[Push] notifyPostLiked called');

  if (senderId === postAuthorId) return { success: true, skipped: true };

  const playerIds = await getPlayerIds([postAuthorId], 'push_post_likes');

  return sendPush(
    playerIds,
    'Post Liked',
    `${senderName || 'Someone'} liked your post`,
    { post_id: postId, type: 'post_liked' }
  );
};

/**
 * Send notification when a post is commented on
 * NEW: Notifies ALL users (except commenter) based on:
 *   - (is_watching this post) OR
 *   - (global push_post_comments = true AND NOT muted this post)
 */
export const notifyPostCommented = async ({
  senderId,
  senderName,
  postId,
  postAuthorId,
  commentText,
}) => {
  console.log('[Push] notifyPostCommented called - enhanced version');

  // Get subscription IDs using the complex filtering logic
  const subscriptionIds = await getPostCommentSubscriptionIds(postId, senderId);

  if (!subscriptionIds.length) {
    console.log('[Push] No users to notify for post comment');
    return { success: true, skipped: true, reason: 'no_eligible_users' };
  }

  // Use commentText preview (first 100 chars)
  const commentPreview = commentText ? commentText.substring(0, 100) : null;

  return sendPush(
    subscriptionIds,
    `${senderName || 'Someone'} commented`,
    commentPreview || 'Left a comment on a post',
    { post_id: postId, type: 'post_commented' }
  );
};

/**
 * Send notification when a comment is replied to
 */
export const notifyCommentReplied = async ({
  senderId,
  senderName,
  postId,
  parentCommentAuthorId,
  commentText,
}) => {
  console.log('[Push] notifyCommentReplied called');

  if (senderId === parentCommentAuthorId) return { success: true, skipped: true };

  const playerIds = await getPlayerIds([parentCommentAuthorId], 'push_comment_replies');

  return sendPush(
    playerIds,
    'Reply to Your Comment',
    `${senderName || 'Someone'} replied to your comment`,
    { post_id: postId, type: 'comment_replied' }
  );
};

// ========== Chat Notification Helpers ==========

/**
 * Send notification for a direct message
 */
export const notifyDirectMessage = async ({
  senderId,
  senderName,
  chatId,
  messagePreview,
}) => {
  console.log('[Push] notifyDirectMessage called');

  // Get chat members except sender
  const { data: members } = await supabase
    .from('chat_members')
    .select('user_id')
    .eq('chat_id', chatId)
    .eq('is_muted', false)
    .neq('user_id', senderId);

  const userIds = members?.map(m => m.user_id) || [];
  const playerIds = await getPlayerIds(userIds, 'push_direct_messages');

  return sendPush(
    playerIds,
    senderName || 'New Message',
    messagePreview || 'You have a new message',
    { chat_id: chatId, type: 'direct_message' }
  );
};

/**
 * Send notification for a group message
 */
export const notifyGroupMessage = async ({
  senderId,
  senderName,
  chatId,
  chatName,
  messagePreview,
}) => {
  console.log('[Push] notifyGroupMessage called');

  // Get unmuted chat members except sender
  const { data: members } = await supabase
    .from('chat_members')
    .select('user_id')
    .eq('chat_id', chatId)
    .eq('is_muted', false)
    .neq('user_id', senderId);

  const userIds = members?.map(m => m.user_id) || [];
  const playerIds = await getPlayerIds(userIds, 'push_group_messages');

  return sendPush(
    playerIds,
    chatName || 'Group Chat',
    `${senderName || 'Someone'}: ${messagePreview || 'sent a message'}`,
    { chat_id: chatId, type: 'group_message' }
  );
};

/**
 * Send notification when user is added to a chat
 */
export const notifyChatMemberAdded = async ({
  senderId,
  targetUserId,
  chatId,
  chatName,
}) => {
  console.log('[Push] notifyChatMemberAdded called');

  const playerIds = await getPlayerIds([targetUserId], 'push_chat_added');

  return sendPush(
    playerIds,
    'Added to Chat',
    `You were added to ${chatName || 'a group chat'}`,
    { chat_id: chatId, type: 'chat_member_added' }
  );
};

/**
 * Send notification when user is removed from a chat
 */
export const notifyChatMemberRemoved = async ({
  senderId,
  targetUserId,
  chatId,
  chatName,
}) => {
  console.log('[Push] notifyChatMemberRemoved called');

  const playerIds = await getPlayerIds([targetUserId], 'push_chat_removed');

  return sendPush(
    playerIds,
    'Removed from Chat',
    `You were removed from ${chatName || 'a group chat'}`,
    { chat_id: chatId, type: 'chat_member_removed' }
  );
};

// ========== Update/Event Notification Helpers ==========

/**
 * Send notification for a new update
 */
export const notifyNewUpdate = async ({
  senderId,
  notificationId,
  title,
  body,
}) => {
  console.log('[Push] notifyNewUpdate called');

  const userIds = await getAllUserIds(senderId);
  const playerIds = await getPlayerIds(userIds, 'push_new_updates');

  return sendPush(
    playerIds,
    title ? `Update: ${title}` : 'New Update',
    body?.substring(0, 100) || 'Tap to read more',
    { notification_id: notificationId, type: 'new_update' }
  );
};

/**
 * Send notification for a new event
 */
export const notifyNewEvent = async ({
  senderId,
  notificationId,
  title,
  body,
}) => {
  console.log('[Push] notifyNewEvent called');

  const userIds = await getAllUserIds(senderId);
  const playerIds = await getPlayerIds(userIds, 'push_new_events');

  return sendPush(
    playerIds,
    title ? `Event: ${title}` : 'New Event',
    body?.substring(0, 100) || 'Tap for details',
    { notification_id: notificationId, type: 'new_event' }
  );
};

// ========== Admin Notification Helpers ==========

/**
 * Send notification when a new user joins
 */
export const notifyNewUserJoined = async ({
  newUserId,
  newUserName,
  newUserEmail,
}) => {
  console.log('[Push] notifyNewUserJoined called');

  // Get admin users
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('is_admin', true);

  const adminIds = admins?.map(a => a.id) || [];
  const playerIds = await getPlayerIds(adminIds);

  return sendPush(
    playerIds,
    'New User Joined',
    `${newUserName || 'A new user'} joined the organization`,
    { user_id: newUserId, type: 'new_user_joined' }
  );
};

/**
 * Send notification when a conversation is reported
 */
export const notifyConversationReported = async ({
  senderId,
  senderName,
  chatId,
  reportReason,
}) => {
  console.log('[Push] notifyConversationReported called');

  // Get admin users
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('is_admin', true);

  const adminIds = admins?.map(a => a.id) || [];
  const playerIds = await getPlayerIds(adminIds);

  return sendPush(
    playerIds,
    'Conversation Reported',
    'A conversation has been reported',
    { chat_id: chatId, type: 'conversation_reported' }
  );
};

/**
 * Send notification to admins when a user RSVPs to an event
 */
export const notifyEventRsvp = async ({
  userId,
  userName,
  eventTitle,
  response,
  notificationId,
}) => {
  console.log('[Push] notifyEventRsvp called');

  // Get admin/owner users
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .or('is_admin.eq.true,is_owner.eq.true');

  const adminIds = admins?.map(a => a.id).filter(id => id !== userId) || [];
  const playerIds = await getPlayerIds(adminIds);

  const responseText = response === 'yes' ? 'Yes' : 'No';

  return sendPush(
    playerIds,
    `RSVP: ${eventTitle || 'Event'}`,
    `${userName || 'Someone'} responded ${responseText}`,
    { notification_id: notificationId, type: 'event_rsvp' }
  );
};
