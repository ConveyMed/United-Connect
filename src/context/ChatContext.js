import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';
import {
  notifyDirectMessage,
  notifyGroupMessage,
  notifyChatMemberAdded,
  notifyChatMemberRemoved,
  notifyConversationReported,
} from '../services/notifications';

const ChatContext = createContext({});

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);

  const subscriptionsRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Fetch user's chats with member info
  const fetchChats = useCallback(async () => {
    if (!user?.id) {
      setChats([]);
      setLoading(false);
      return;
    }

    try {
      // Get chats where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          is_pinned,
          is_archived,
          is_muted,
          last_read_at,
          role,
          chats (
            id,
            name,
            is_group,
            avatar_url,
            last_message_at,
            last_message_preview,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .is('left_at', null)
        .order('is_pinned', { ascending: false });

      if (memberError) throw memberError;

      // Get all chat IDs
      const chatIds = memberData.map(m => m.chat_id);

      if (chatIds.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      // Get all members for these chats (for displaying other users in 1:1 chats)
      const { data: allMembers, error: allMembersError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          user_id,
          role,
          last_read_at,
          users:user_id (
            id,
            first_name,
            last_name,
            profile_image_url,
            email
          )
        `)
        .in('chat_id', chatIds)
        .is('left_at', null);

      if (allMembersError) throw allMembersError;

      // Get unread counts
      const { data: unreadData, error: unreadError } = await supabase
        .from('messages')
        .select('chat_id, created_at')
        .in('chat_id', chatIds)
        .neq('sender_id', user.id);

      // Build unread counts
      const counts = {};
      let total = 0;
      memberData.forEach(m => {
        const lastReadAt = m.last_read_at ? new Date(m.last_read_at) : new Date(0); // If never read, treat as epoch
        const chatMessages = unreadData?.filter(msg =>
          msg.chat_id === m.chat_id &&
          new Date(msg.created_at) > lastReadAt
        ) || [];
        counts[m.chat_id] = chatMessages.length;
        if (!m.is_archived) total += chatMessages.length;
      });
      setUnreadCounts(counts);
      setTotalUnread(total);

      // Build chat objects with member info
      const formattedChats = memberData
        .filter(m => m.chats)
        .map(m => {
          const chatMembers = allMembers?.filter(am => am.chat_id === m.chat_id) || [];
          const otherMembers = chatMembers.filter(cm => cm.user_id !== user.id);

          // For 1:1 chats, use the other person's info
          let displayName = m.chats.name;
          let displayAvatar = m.chats.avatar_url;

          if (!m.chats.is_group && otherMembers.length === 1) {
            const other = otherMembers[0]?.users;
            if (other) {
              displayName = `${other.first_name || ''} ${other.last_name || ''}`.trim() || other.email || 'Unknown';
              displayAvatar = other.profile_image_url;
            }
          }

          return {
            ...m.chats,
            is_pinned: m.is_pinned,
            is_archived: m.is_archived,
            is_muted: m.is_muted,
            last_read_at: m.last_read_at,
            my_role: m.role,
            members: chatMembers,
            other_members: otherMembers,
            display_name: displayName,
            display_avatar: displayAvatar,
            unread_count: counts[m.chat_id] || 0
          };
        })
        .sort((a, b) => {
          // Pinned first, then by last message
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.last_message_at) - new Date(a.last_message_at);
        });

      setChats(formattedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Mark chat as read (defined before fetchMessages since it depends on this)
  const markChatAsRead = useCallback(async (chatId) => {
    if (!user?.id || !chatId) return;

    try {
      const { error: updateError } = await supabase
        .from('chat_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error marking chat as read:', updateError);
        return;
      }

      // Get current unread from chats state and update all states
      setChats(prevChats => {
        const chat = prevChats.find(c => c.id === chatId);
        const currentUnread = chat?.unread_count || 0;

        // Update total unread count
        if (currentUnread > 0) {
          setTotalUnread(prev => Math.max(0, prev - currentUnread));
        }

        // Update unread counts map
        setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));

        // Return updated chats with this chat's unread_count set to 0
        return prevChats.map(c =>
          c.id === chatId ? { ...c, unread_count: 0 } : c
        );
      });
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }, [user?.id]);

  // Fetch messages for a specific chat
  const fetchMessages = useCallback(async (chatId, limit = 50) => {
    if (!chatId) return;

    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            profile_image_url
          ),
          reactions:message_reactions (
            id,
            emoji,
            user_id
          )
        `)
        .eq('chat_id', chatId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      setMessages(data || []);

      // Mark as read
      await markChatAsRead(chatId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, [markChatAsRead]);

  // Send a message
  const sendMessage = useCallback(async (chatId, content, messageType = 'text', fileData = null) => {
    if (!user?.id || !chatId) return null;

    try {
      const messageData = {
        chat_id: chatId,
        sender_id: user.id,
        content,
        message_type: messageType
      };

      if (fileData) {
        messageData.file_url = fileData.url;
        messageData.file_name = fileData.name;
        messageData.file_type = fileData.type;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:users!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            profile_image_url
          )
        `)
        .single();

      if (error) throw error;

      // Add message to local state immediately
      if (data) {
        setMessages(prev => [...prev, data]);

        // Send push notification
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
          const senderName = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim();
          const messagePreview = content.substring(0, 50);

          if (chat.is_group) {
            notifyGroupMessage({
              senderId: user.id,
              senderName,
              chatId,
              chatName: chat.display_name || chat.name || 'Group Chat',
              messagePreview,
            }).catch(err => console.error('Notification error:', err));
          } else {
            notifyDirectMessage({
              senderId: user.id,
              senderName,
              chatId,
              messagePreview,
            }).catch(err => console.error('Notification error:', err));
          }
        }
      }

      // Clear typing indicator
      await clearTyping(chatId);

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }, [user?.id, chats, userProfile]);

  // Create a new chat (1:1 or group)
  const createChat = useCallback(async (memberIds, isGroup = false, groupName = null) => {
    if (!user?.id) return null;

    try {
      // For 1:1 chats, check if one already exists
      if (!isGroup && memberIds.length === 1) {
        const existingChat = chats.find(c =>
          !c.is_group &&
          c.other_members.some(m => m.user_id === memberIds[0])
        );
        if (existingChat) return existingChat;
      }

      // Create the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: isGroup ? groupName : null,
          is_group: isGroup,
          created_by: user.id
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add all members (including creator)
      const allMemberIds = [...new Set([user.id, ...memberIds])];
      const memberInserts = allMemberIds.map(memberId => ({
        chat_id: chat.id,
        user_id: memberId,
        role: memberId === user.id ? 'admin' : 'member',
        added_by: user.id
      }));

      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(memberInserts);

      if (membersError) throw membersError;

      // Refresh chats
      await fetchChats();

      return chat;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }, [user?.id, chats, fetchChats]);

  // Toggle pin
  const togglePin = useCallback(async (chatId) => {
    if (!user?.id) return;

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    try {
      await supabase
        .from('chat_members')
        .update({ is_pinned: !chat.is_pinned })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, is_pinned: !c.is_pinned } : c
      ).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      }));
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  }, [user?.id, chats]);

  // Toggle archive
  const toggleArchive = useCallback(async (chatId) => {
    if (!user?.id) return;

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    try {
      await supabase
        .from('chat_members')
        .update({ is_archived: !chat.is_archived })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, is_archived: !c.is_archived } : c
      ));
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  }, [user?.id, chats]);

  // Toggle mute
  const toggleMute = useCallback(async (chatId) => {
    if (!user?.id) return;

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    try {
      await supabase
        .from('chat_members')
        .update({ is_muted: !chat.is_muted })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, is_muted: !c.is_muted } : c
      ));
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [user?.id, chats]);

  // Set typing indicator
  const setTyping = useCallback(async (chatId) => {
    if (!user?.id || !chatId || isTypingRef.current) return;

    isTypingRef.current = true;

    try {
      await supabase
        .from('chat_typing')
        .upsert({
          chat_id: chatId,
          user_id: user.id,
          started_at: new Date().toISOString()
        });

      // Auto-clear after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        clearTyping(chatId);
      }, 3000);
    } catch (error) {
      console.error('Error setting typing:', error);
    }
  }, [user?.id]);

  // Clear typing indicator
  const clearTyping = useCallback(async (chatId) => {
    if (!user?.id || !chatId) return;

    isTypingRef.current = false;

    try {
      await supabase
        .from('chat_typing')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error clearing typing:', error);
    }
  }, [user?.id]);

  // Add reaction
  const addReaction = useCallback(async (messageId, emoji) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });
    } catch (error) {
      // Might fail if already exists, which is fine
      console.log('Reaction may already exist');
    }
  }, [user?.id]);

  // Remove reaction
  const removeReaction = useCallback(async (messageId, emoji) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }, [user?.id]);

  // Report chat
  const reportChat = useCallback(async (chatId, messageId, reason, description) => {
    if (!user?.id) return false;

    try {
      // Get the message to find reported user
      let reportedUserId = null;
      if (messageId) {
        const { data: message } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('id', messageId)
          .single();
        reportedUserId = message?.sender_id;
      }

      await supabase
        .from('chat_reports')
        .insert({
          chat_id: chatId,
          message_id: messageId,
          reported_by: user.id,
          reported_user_id: reportedUserId,
          reason,
          description
        });

      // Send notification to admins
      const senderName = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim();
      notifyConversationReported({
        senderId: user.id,
        senderName,
        chatId,
        reportReason: reason || description || 'No reason provided',
      }).catch(err => console.error('Notification error:', err));

      return true;
    } catch (error) {
      console.error('Error reporting:', error);
      return false;
    }
  }, [user?.id, userProfile]);

  // Delete message (soft delete)
  const deleteMessage = useCallback(async (messageId) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          content: null
        })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }, [user?.id]);

  // Edit message
  const editMessage = useCallback(async (messageId, newContent) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: newContent, is_edited: true } : m
      ));
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }, [user?.id]);

  // Leave chat (for groups)
  const leaveChat = useCallback(async (chatId) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('chat_members')
        .update({ left_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error leaving chat:', error);
    }
  }, [user?.id, activeChat]);

  // Add members to group
  const addMembers = useCallback(async (chatId, memberIds) => {
    if (!user?.id) return;

    try {
      const inserts = memberIds.map(memberId => ({
        chat_id: chatId,
        user_id: memberId,
        role: 'member',
        added_by: user.id
      }));

      await supabase
        .from('chat_members')
        .insert(inserts);

      // Send notifications to added members
      const chat = chats.find(c => c.id === chatId);
      const chatName = chat?.display_name || chat?.name || 'a group chat';
      memberIds.forEach(memberId => {
        notifyChatMemberAdded({
          senderId: user.id,
          targetUserId: memberId,
          chatId,
          chatName,
        }).catch(err => console.error('Notification error:', err));
      });

      await fetchChats();
    } catch (error) {
      console.error('Error adding members:', error);
    }
  }, [user?.id, fetchChats, chats]);

  // Remove member from group
  const removeMember = useCallback(async (chatId, memberId) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('chat_members')
        .update({ left_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', memberId);

      // Send notification to removed member
      const chat = chats.find(c => c.id === chatId);
      const chatName = chat?.display_name || chat?.name || 'a group chat';
      notifyChatMemberRemoved({
        senderId: user.id,
        targetUserId: memberId,
        chatId,
        chatName,
      }).catch(err => console.error('Notification error:', err));

      await fetchChats();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  }, [user?.id, fetchChats, chats]);

  // Update group name
  const updateGroupName = useCallback(async (chatId, name) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('chats')
        .update({ name })
        .eq('id', chatId);

      setChats(prev => prev.map(c =>
        c.id === chatId ? { ...c, name, display_name: name } : c
      ));
    } catch (error) {
      console.error('Error updating group name:', error);
    }
  }, [user?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    fetchChats();

    // Subscribe to new messages in user's chats
    const messagesChannel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMessage = payload.new;

          // Check if user is member of this chat
          const isMyChat = chats.some(c => c.id === newMessage.chat_id);

          if (isMyChat) {
            // Fetch full message with sender info
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users!messages_sender_id_fkey (
                  id,
                  first_name,
                  last_name,
                  profile_image_url
                )
              `)
              .eq('id', newMessage.id)
              .single();

            if (data) {
              // If it's the active chat, add to messages (avoid duplicates)
              if (activeChat?.id === newMessage.chat_id) {
                setMessages(prev => {
                  // Check if message already exists (from sendMessage)
                  if (prev.some(m => m.id === data.id)) return prev;
                  return [...prev, data];
                });
              }

              // Update chat preview and unread count
              if (newMessage.sender_id !== user.id) {
                setUnreadCounts(prev => ({
                  ...prev,
                  [newMessage.chat_id]: (prev[newMessage.chat_id] || 0) + 1
                }));
                setTotalUnread(prev => prev + 1);
              }

              // Update chat's last message
              setChats(prev => prev.map(c =>
                c.id === newMessage.chat_id
                  ? {
                      ...c,
                      last_message_at: newMessage.created_at,
                      last_message_preview: newMessage.content?.substring(0, 100) || 'Sent a file',
                      unread_count: newMessage.sender_id !== user.id
                        ? (c.unread_count || 0) + 1
                        : c.unread_count
                    }
                  : c
              ).sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                return new Date(b.last_message_at) - new Date(a.last_message_at);
              }));
            }
          }
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel('typing-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_typing'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { chat_id, user_id } = payload.new;
            if (user_id !== user.id) {
              // Fetch user info
              const { data: typingUser } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', user_id)
                .single();

              setTypingUsers(prev => ({
                ...prev,
                [chat_id]: {
                  ...prev[chat_id],
                  [user_id]: typingUser?.first_name || 'Someone'
                }
              }));

              // Auto-clear after 4 seconds
              setTimeout(() => {
                setTypingUsers(prev => {
                  const chatTyping = { ...prev[chat_id] };
                  delete chatTyping[user_id];
                  return { ...prev, [chat_id]: chatTyping };
                });
              }, 4000);
            }
          } else if (payload.eventType === 'DELETE') {
            const { chat_id, user_id } = payload.old;
            setTypingUsers(prev => {
              const chatTyping = { ...prev[chat_id] };
              delete chatTyping[user_id];
              return { ...prev, [chat_id]: chatTyping };
            });
          }
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel('reactions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const { message_id, emoji, user_id, id } = payload.new;
            setMessages(prev => prev.map(m =>
              m.id === message_id
                ? {
                    ...m,
                    reactions: [...(m.reactions || []), { id, emoji, user_id }]
                  }
                : m
            ));
          } else if (payload.eventType === 'DELETE') {
            const { message_id, id } = payload.old;
            setMessages(prev => prev.map(m =>
              m.id === message_id
                ? {
                    ...m,
                    reactions: (m.reactions || []).filter(r => r.id !== id)
                  }
                : m
            ));
          }
        }
      )
      .subscribe();

    subscriptionsRef.current = [messagesChannel, typingChannel, reactionsChannel];

    return () => {
      subscriptionsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user?.id, fetchChats, activeChat?.id, chats]);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat?.id) {
      fetchMessages(activeChat.id);
    } else {
      setMessages([]);
    }
  }, [activeChat?.id, fetchMessages]);

  const value = {
    // State
    chats,
    activeChat,
    messages,
    typingUsers,
    loading,
    messagesLoading,
    unreadCounts,
    totalUnread,

    // Actions
    setActiveChat,
    fetchChats,
    fetchMessages,
    sendMessage,
    createChat,
    markChatAsRead,
    togglePin,
    toggleArchive,
    toggleMute,
    setTyping,
    clearTyping,
    addReaction,
    removeReaction,
    reportChat,
    deleteMessage,
    editMessage,
    leaveChat,
    addMembers,
    removeMember,
    updateGroupName
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
