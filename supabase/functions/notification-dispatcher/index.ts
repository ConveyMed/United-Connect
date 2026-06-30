import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Notification event types
type NotificationEvent =
  | 'new_post'
  | 'post_liked'
  | 'post_commented'
  | 'comment_replied'
  | 'bookmarked_post_commented'
  | 'direct_message'
  | 'group_message'
  | 'chat_member_added'
  | 'chat_member_removed'
  | 'new_update'
  | 'new_event'
  | 'event_reminder'
  | 'new_user_joined'
  | 'conversation_reported';

interface NotificationPayload {
  event: NotificationEvent;

  // Common fields
  sender_id?: string;           // User who triggered the event
  sender_name?: string;         // Display name of sender

  // Post-related
  post_id?: string;
  post_author_id?: string;
  post_preview?: string;

  // Comment-related
  comment_id?: string;
  comment_text?: string;
  parent_comment_author_id?: string;

  // Chat-related
  chat_id?: string;
  chat_name?: string;
  message_preview?: string;
  target_user_id?: string;      // For add/remove member events

  // Update/Event-related
  notification_id?: string;
  title?: string;
  body?: string;

  // Admin events
  new_user_id?: string;
  new_user_name?: string;
  new_user_email?: string;
  report_reason?: string;

  // Flags from post creation
  notify_push?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("Notification event:", payload.event);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Helper to call other edge functions
    const callEdgeFunction = async (functionName: string, body: Record<string, unknown>) => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify(body),
      });
      return response.json();
    };

    // Helper to get all user IDs in organization
    const getAllUserIds = async (): Promise<string[]> => {
      const { data, error } = await supabase.from('users').select('id');
      if (error) {
        console.error("Error fetching users:", error);
        return [];
      }
      return data.map(u => u.id);
    };

    // Helper to get admin user IDs
    const getAdminUserIds = async (): Promise<string[]> => {
      const { data, error } = await supabase.from('users').select('id').eq('is_admin', true);
      if (error) {
        console.error("Error fetching admins:", error);
        return [];
      }
      return data.map(u => u.id);
    };

    // Helper to get users who bookmarked a post
    const getBookmarkUserIds = async (postId: string): Promise<string[]> => {
      const { data, error } = await supabase.from('post_bookmarks').select('user_id').eq('post_id', postId);
      if (error) {
        console.error("Error fetching bookmarks:", error);
        return [];
      }
      return data.map(b => b.user_id);
    };

    // Helper to get chat member IDs
    const getChatMemberIds = async (chatId: string, excludeUserId?: string): Promise<string[]> => {
      let query = supabase.from('chat_members').select('user_id').eq('chat_id', chatId);
      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching chat members:", error);
        return [];
      }
      return data.map(m => m.user_id);
    };

    // Helper to check if chat is muted for a user
    const getUnmutedChatMembers = async (chatId: string, excludeUserId?: string): Promise<string[]> => {
      let query = supabase
        .from('chat_members')
        .select('user_id')
        .eq('chat_id', chatId)
        .eq('is_muted', false);
      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching unmuted chat members:", error);
        return [];
      }
      return data.map(m => m.user_id);
    };

    const results: Record<string, unknown> = { event: payload.event };

    // Route based on event type
    switch (payload.event) {
      // ========== POST EVENTS ==========
      case 'new_post': {
        // Only send if post creator enabled notifications
        if (!payload.notify_push) {
          results.message = "Notifications disabled for this post";
          break;
        }

        const allUsers = await getAllUserIds();
        const targetUsers = allUsers.filter(id => id !== payload.sender_id);

        if (payload.notify_push) {
          results.push = await callEdgeFunction('send-push-notification', {
            user_ids: targetUsers,
            exclude_user_id: payload.sender_id,
            title: 'New Post',
            message: payload.post_preview || `${payload.sender_name} published a new post`,
            notification_type: 'new_post',
            data: { post_id: payload.post_id },
          });
        }

        break;
      }

      case 'post_liked': {
        if (!payload.post_author_id || payload.post_author_id === payload.sender_id) break;

        results.push = await callEdgeFunction('send-push-notification', {
          user_ids: [payload.post_author_id],
          title: 'Post Liked',
          message: `${payload.sender_name || 'Someone'} liked your post`,
          notification_type: 'post_like',
          data: { post_id: payload.post_id },
        });
        break;
      }

      case 'post_commented': {
        if (!payload.post_author_id || payload.post_author_id === payload.sender_id) break;

        results.push = await callEdgeFunction('send-push-notification', {
          user_ids: [payload.post_author_id],
          title: 'New Comment',
          message: `${payload.sender_name || 'Someone'} commented on your post`,
          notification_type: 'post_comment',
          data: { post_id: payload.post_id },
        });

        break;
      }

      case 'comment_replied': {
        if (!payload.parent_comment_author_id || payload.parent_comment_author_id === payload.sender_id) break;

        results.push = await callEdgeFunction('send-push-notification', {
          user_ids: [payload.parent_comment_author_id],
          title: 'Reply to Your Comment',
          message: `${payload.sender_name || 'Someone'} replied to your comment`,
          notification_type: 'comment_reply',
          data: { post_id: payload.post_id },
        });
        break;
      }

      case 'bookmarked_post_commented': {
        if (!payload.post_id) break;

        const bookmarkUsers = await getBookmarkUserIds(payload.post_id);
        const targetUsers = bookmarkUsers.filter(id => id !== payload.sender_id && id !== payload.post_author_id);

        if (targetUsers.length > 0) {
          results.push = await callEdgeFunction('send-push-notification', {
            user_ids: targetUsers,
            title: 'New Comment',
            message: `New comment on a post you bookmarked`,
            notification_type: 'bookmarked_comment',
            data: { post_id: payload.post_id },
          });
        }
        break;
      }

      // ========== CHAT EVENTS ==========
      case 'direct_message': {
        if (!payload.chat_id) break;

        const unmutedMembers = await getUnmutedChatMembers(payload.chat_id, payload.sender_id);

        if (unmutedMembers.length > 0) {
          results.push = await callEdgeFunction('send-push-notification', {
            user_ids: unmutedMembers,
            title: payload.sender_name || 'New Message',
            message: payload.message_preview || 'You have a new message',
            notification_type: 'direct_message',
            data: { chat_id: payload.chat_id },
          });
        }
        break;
      }

      case 'group_message': {
        if (!payload.chat_id) break;

        const unmutedMembers = await getUnmutedChatMembers(payload.chat_id, payload.sender_id);

        if (unmutedMembers.length > 0) {
          results.push = await callEdgeFunction('send-push-notification', {
            user_ids: unmutedMembers,
            title: payload.chat_name || 'Group Chat',
            message: `${payload.sender_name || 'Someone'}: ${payload.message_preview || 'sent a message'}`,
            notification_type: 'group_message',
            data: { chat_id: payload.chat_id },
          });
        }
        break;
      }

      case 'chat_member_added': {
        if (!payload.target_user_id) break;

        results.push = await callEdgeFunction('send-push-notification', {
          user_ids: [payload.target_user_id],
          title: 'Added to Chat',
          message: `You were added to ${payload.chat_name || 'a group chat'}`,
          notification_type: 'chat_added',
          data: { chat_id: payload.chat_id },
        });
        break;
      }

      case 'chat_member_removed': {
        if (!payload.target_user_id) break;

        results.push = await callEdgeFunction('send-push-notification', {
          user_ids: [payload.target_user_id],
          title: 'Removed from Chat',
          message: `You were removed from ${payload.chat_name || 'a group chat'}`,
          notification_type: 'chat_removed',
          data: { chat_id: payload.chat_id },
        });
        break;
      }

      // ========== UPDATE/EVENT EVENTS ==========
      case 'new_update': {
        const allUsers = await getAllUserIds();
        const targetUsers = allUsers.filter(id => id !== payload.sender_id);

        results.push = await callEdgeFunction('send-push-notification', {
          user_ids: targetUsers,
          exclude_user_id: payload.sender_id,
          title: payload.title || 'New Update',
          message: payload.body?.substring(0, 100) || 'A new update has been published',
          notification_type: 'new_update',
          data: { notification_id: payload.notification_id },
        });

        break;
      }

      case 'new_event': {
        const allUsers = await getAllUserIds();
        const targetUsers = allUsers.filter(id => id !== payload.sender_id);

        results.push = await callEdgeFunction('send-push-notification', {
          user_ids: targetUsers,
          exclude_user_id: payload.sender_id,
          title: 'New Event',
          message: payload.title || 'A new event has been created',
          notification_type: 'new_event',
          data: { notification_id: payload.notification_id },
        });
        break;
      }

      case 'event_reminder': {
        // This would typically be called by a cron job
        // Needs user_ids to be passed in
        break;
      }

      // ========== ADMIN EVENTS ==========
      case 'new_user_joined': {
        const adminIds = await getAdminUserIds();

        if (adminIds.length > 0) {
          results.push = await callEdgeFunction('send-push-notification', {
            user_ids: adminIds,
            title: 'New User Joined',
            message: `${payload.new_user_name || 'A new user'} joined the organization`,
            notification_type: 'new_user',
            data: { user_id: payload.new_user_id },
          });
        }
        break;
      }

      case 'conversation_reported': {
        const adminIds = await getAdminUserIds();

        if (adminIds.length > 0) {
          results.push = await callEdgeFunction('send-push-notification', {
            user_ids: adminIds,
            title: 'Conversation Reported',
            message: `A conversation has been reported`,
            notification_type: 'report',
            data: { chat_id: payload.chat_id },
          });
        }
        break;
      }

      default:
        results.message = `Unknown event type: ${payload.event}`;
    }

    console.log("Notification results:", results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
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
