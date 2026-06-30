import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { openInAppBrowser } from '../utils/browser';

// Icons
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const SendIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const ImageIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const MoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DoubleCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 6 9 17 4 12" />
    <polyline points="22 6 13 17" />
  </svg>
);

// Quick reactions
const QUICK_REACTIONS = ['thumbsup', 'heart', 'laugh', 'wow', 'sad', 'angry'];

const ChatConversation = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    chats,
    messages,
    messagesLoading,
    typingUsers,
    setActiveChat,
    sendMessage,
    setTyping,
    clearTyping,
    addReaction,
    removeReaction,
    deleteMessage,
    editMessage,
    reportChat,
    toggleMute,
    togglePin,
    leaveChat,
    updateGroupName,
    addMembers,
    removeMember
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get current chat
  const chat = chats.find(c => c.id === chatId);

  // Set active chat on mount
  useEffect(() => {
    if (chat) {
      setActiveChat(chat);
    }
    return () => setActiveChat(null);
  }, [chat, setActiveChat]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get typing text
  const typingText = (() => {
    const typing = typingUsers[chatId];
    if (!typing || Object.keys(typing).length === 0) return null;
    const names = Object.values(typing);
    if (names.length === 1) return `${names[0]} is typing...`;
    return 'Several people are typing...';
  })();

  const handleSend = async () => {
    if (!inputValue.trim() && !uploading) return;

    if (editingMessage) {
      await editMessage(editingMessage.id, inputValue.trim());
      setEditingMessage(null);
    } else {
      await sendMessage(chatId, inputValue.trim());
    }

    setInputValue('');
    clearTyping(chatId);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setTyping(chatId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${chatId}/${Date.now()}.${fileExt}`;
      const isImage = file.type.startsWith('image/');

      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      await sendMessage(
        chatId,
        isImage ? '' : file.name,
        isImage ? 'image' : 'file',
        { url: publicUrl, name: file.name, type: file.type }
      );
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleReaction = async (messageId, emoji) => {
    const message = messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions?.find(
      r => r.user_id === user?.id && r.emoji === emoji
    );

    if (existingReaction) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
    setSelectedMessage(null);
  };

  const handleDeleteMessage = async (messageId) => {
    await deleteMessage(messageId);
    setSelectedMessage(null);
  };

  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setInputValue(message.content);
    setSelectedMessage(null);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInputValue('');
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDateDivider = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const shouldShowDateDivider = (message, index) => {
    if (index === 0) return true;
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    const currDate = new Date(message.created_at).toDateString();
    return prevDate !== currDate;
  };

  const renderMessage = (message, index) => {
    const isOwn = message.sender_id === user?.id;
    const showAvatar = !isOwn && (
      index === messages.length - 1 ||
      messages[index + 1]?.sender_id !== message.sender_id
    );
    const showName = chat?.is_group && !isOwn && (
      index === 0 ||
      messages[index - 1]?.sender_id !== message.sender_id
    );

    return (
      <div key={message.id}>
        {shouldShowDateDivider(message, index) && (
          <div style={styles.dateDivider}>
            <span style={styles.dateDividerText}>
              {formatDateDivider(message.created_at)}
            </span>
          </div>
        )}

        <div
          style={{
            ...styles.messageRow,
            justifyContent: isOwn ? 'flex-end' : 'flex-start'
          }}
        >
          {!isOwn && (
            <div style={styles.avatarSpace}>
              {showAvatar && (
                message.sender?.profile_image_url ? (
                  <img
                    src={message.sender.profile_image_url}
                    alt=""
                    style={styles.messageAvatar}
                  />
                ) : (
                  <div style={styles.messageAvatarPlaceholder}>
                    <UserIcon />
                  </div>
                )
              )}
            </div>
          )}

          <div style={{ maxWidth: '75%' }}>
            {showName && (
              <span style={styles.senderName}>
                {message.sender?.first_name} {message.sender?.last_name}
              </span>
            )}

            <div
              style={{
                ...styles.messageBubble,
                ...(isOwn ? styles.ownBubble : styles.otherBubble)
              }}
              onClick={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
            >
              {/* Reply Preview */}
              {message.reply_to?.sender && (
                <div style={styles.replyPreview}>
                  <span style={styles.replyName}>
                    {message.reply_to.sender.first_name || 'Unknown'}
                  </span>
                  <span style={styles.replyText}>
                    {message.reply_to.content?.substring(0, 50) || ''}
                  </span>
                </div>
              )}

              {/* Image */}
              {message.message_type === 'image' && message.file_url && (
                <img
                  src={message.file_url}
                  alt=""
                  style={styles.messageImage}
                  onClick={(e) => {
                    e.stopPropagation();
                    openInAppBrowser(message.file_url);
                  }}
                />
              )}

              {/* File */}
              {message.message_type === 'file' && (
                <button
                  style={styles.fileAttachment}
                  onClick={(e) => {
                    e.stopPropagation();
                    openInAppBrowser(message.file_url);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>{message.file_name || 'File'}</span>
                </button>
              )}

              {/* Text Content */}
              {message.content && (
                <p style={{
                  ...styles.messageText,
                  color: isOwn ? '#ffffff' : 'var(--text-dark)'
                }}>
                  {message.content}
                </p>
              )}

              {/* Time & Status */}
              <div style={{
                ...styles.messageFooter,
                justifyContent: isOwn ? 'flex-end' : 'flex-start'
              }}>
                <span style={{
                  ...styles.messageTime,
                  color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-light)'
                }}>
                  {message.is_edited && <span>edited </span>}
                  {formatMessageTime(message.created_at)}
                </span>
                {isOwn && (
                  <span style={{ color: 'rgba(255,255,255,0.7)', marginLeft: '4px' }}>
                    {/* Check if any other member has read this message */}
                    {chat?.other_members?.some(m =>
                      m.last_read_at && new Date(m.last_read_at) >= new Date(message.created_at)
                    ) ? <DoubleCheckIcon /> : <CheckIcon />}
                  </span>
                )}
              </div>
            </div>

            {/* Reactions */}
            {message.reactions?.length > 0 && (
              <div style={{
                ...styles.reactionsRow,
                justifyContent: isOwn ? 'flex-end' : 'flex-start'
              }}>
                {Object.entries(
                  message.reactions.reduce((acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    style={styles.reactionBubble}
                    onClick={() => handleReaction(message.id, emoji)}
                  >
                    {getEmojiDisplay(emoji)} {count > 1 && count}
                  </button>
                ))}
              </div>
            )}

            {/* Message Actions */}
            {selectedMessage === message.id && (
              <div style={{
                ...styles.messageActions,
                ...(isOwn ? { right: 0 } : { left: 0 })
              }}>
                <div style={styles.quickReactions}>
                  {QUICK_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      style={styles.reactionBtn}
                      onClick={() => handleReaction(message.id, emoji)}
                    >
                      {getEmojiDisplay(emoji)}
                    </button>
                  ))}
                </div>
                <div style={styles.actionButtons}>
                  {isOwn && (
                    <>
                      <button
                        style={styles.actionBtn}
                        onClick={() => handleEditMessage(message)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.actionBtn}
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {!isOwn && (
                    <button
                      style={styles.actionBtn}
                      onClick={() => {
                        setSelectedMessage(null);
                        setShowReportModal({ messageId: message.id });
                      }}
                    >
                      Report
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getEmojiDisplay = (emoji) => {
    const emojiMap = {
      thumbsup: 'like',
      heart: 'love',
      laugh: 'haha',
      wow: 'wow',
      sad: 'sad',
      angry: 'angry'
    };
    return emojiMap[emoji] || emoji;
  };

  if (!chat) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/chat')}>
          <BackIcon />
        </button>

        <div
          style={styles.headerInfo}
          onClick={() => setShowInfo(true)}
        >
          {chat.display_avatar ? (
            <img src={chat.display_avatar} alt="" style={styles.headerAvatar} />
          ) : (
            <div style={styles.headerAvatarPlaceholder}>
              {chat.is_group ? <UsersIcon /> : <UserIcon />}
            </div>
          )}
          <div style={styles.headerText}>
            <h2 style={styles.headerName}>{chat.display_name}</h2>
            {typingText ? (
              <span style={styles.typingText}>{typingText}</span>
            ) : chat.is_group ? (
              <span style={styles.headerSubtext}>
                {chat.members?.length} members
              </span>
            ) : null}
          </div>
        </div>

        <button style={styles.menuButton} onClick={() => setShowMenu(!showMenu)}>
          <MoreIcon />
        </button>

        {showMenu && (
          <div style={styles.headerMenu}>
            <button
              style={styles.menuItem}
              onClick={() => { toggleMute(chatId); setShowMenu(false); }}
            >
              {chat.is_muted ? 'Unmute' : 'Mute notifications'}
            </button>
            <button
              style={styles.menuItem}
              onClick={() => { togglePin(chatId); setShowMenu(false); }}
            >
              {chat.is_pinned ? 'Unpin' : 'Pin conversation'}
            </button>
            <button
              style={styles.menuItem}
              onClick={() => { setShowInfo(true); setShowMenu(false); }}
            >
              {chat.is_group ? 'Group info' : 'View profile'}
            </button>
            {chat.is_group && (
              <button
                style={{ ...styles.menuItem, color: '#ef4444' }}
                onClick={() => {
                  if (window.confirm('Leave this group?')) {
                    leaveChat(chatId);
                    navigate('/chat');
                  }
                  setShowMenu(false);
                }}
              >
                Leave group
              </button>
            )}
          </div>
        )}
      </header>

      {/* Messages */}
      <div style={styles.messagesContainer}>
        {messagesLoading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
          </div>
        ) : messages.length === 0 ? (
          <div style={styles.emptyMessages}>
            <p style={styles.emptyText}>No messages yet</p>
            <p style={styles.emptySubtext}>Say hello!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => renderMessage(msg, idx))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div style={styles.inputArea}>
        {editingMessage && (
          <div style={styles.editingBanner}>
            <span>Editing message</span>
            <button style={styles.cancelEdit} onClick={cancelEdit}>Cancel</button>
          </div>
        )}

        <div style={styles.inputRow}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
          />

          <button
            style={styles.attachButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon />
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            style={styles.input}
          />

          <button
            style={{
              ...styles.sendButton,
              opacity: inputValue.trim() ? 1 : 0.5
            }}
            onClick={handleSend}
            disabled={!inputValue.trim() || uploading}
          >
            {uploading ? (
              <div style={styles.smallSpinner} />
            ) : (
              <SendIcon />
            )}
          </button>
        </div>
      </div>

      {/* Info Drawer */}
      {showInfo && (
        <ChatInfoDrawer
          chat={chat}
          onClose={() => setShowInfo(false)}
          onAddMembers={() => setShowAddMembers(true)}
          onRemoveMember={removeMember}
          onUpdateName={updateGroupName}
          onLeave={() => {
            leaveChat(chatId);
            navigate('/chat');
          }}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onSubmit={async (reason, description) => {
            await reportChat(chatId, showReportModal.messageId, reason, description);
            setShowReportModal(false);
          }}
        />
      )}

      {/* Add Members Modal */}
      {showAddMembers && (
        <AddMembersModal
          chat={chat}
          onClose={() => setShowAddMembers(false)}
          onAdd={async (memberIds) => {
            await addMembers(chatId, memberIds);
            setShowAddMembers(false);
          }}
        />
      )}
    </div>
  );
};

// Chat Info Drawer Component
const ChatInfoDrawer = ({ chat, onClose, onAddMembers, onRemoveMember, onUpdateName, onLeave }) => {
  const { user } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState(chat.name || '');
  const isAdmin = chat.my_role === 'admin' || chat.created_by === user?.id;

  const handleSaveName = () => {
    if (groupName.trim()) {
      onUpdateName(chat.id, groupName.trim());
    }
    setEditingName(false);
  };

  return (
    <div style={styles.drawerOverlay} onClick={onClose}>
      <div style={styles.drawer} onClick={e => e.stopPropagation()}>
        <div style={styles.drawerHeader}>
          <h3 style={styles.drawerTitle}>
            {chat.is_group ? 'Group Info' : 'Chat Info'}
          </h3>
          <button style={styles.closeBtn} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div style={styles.drawerContent}>
          {/* Avatar & Name */}
          <div style={styles.drawerProfile}>
            {chat.display_avatar ? (
              <img src={chat.display_avatar} alt="" style={styles.drawerAvatar} />
            ) : (
              <div style={styles.drawerAvatarPlaceholder}>
                {chat.is_group ? <UsersIcon /> : <UserIcon />}
              </div>
            )}

            {chat.is_group && isAdmin ? (
              editingName ? (
                <div style={styles.editNameRow}>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    style={styles.nameInput}
                    autoFocus
                  />
                  <button style={styles.saveNameBtn} onClick={handleSaveName}>
                    <CheckIcon />
                  </button>
                </div>
              ) : (
                <h4
                  style={{ ...styles.drawerName, cursor: 'pointer' }}
                  onClick={() => setEditingName(true)}
                >
                  {chat.display_name}
                  <span style={styles.editHint}>(tap to edit)</span>
                </h4>
              )
            ) : (
              <h4 style={styles.drawerName}>{chat.display_name}</h4>
            )}
          </div>

          {/* Members */}
          {chat.is_group && (
            <div style={styles.membersSection}>
              <div style={styles.membersSectionHeader}>
                <span style={styles.sectionTitle}>
                  {chat.members?.length} Members
                </span>
                {isAdmin && (
                  <button style={styles.addMemberBtn} onClick={onAddMembers}>
                    + Add
                  </button>
                )}
              </div>

              <div style={styles.membersList}>
                {chat.members?.map(member => (
                  <div key={member.user_id} style={styles.memberItem}>
                    {member.users?.profile_image_url ? (
                      <img
                        src={member.users.profile_image_url}
                        alt=""
                        style={styles.memberAvatar}
                      />
                    ) : (
                      <div style={styles.memberAvatarPlaceholder}>
                        <UserIcon />
                      </div>
                    )}
                    <div style={styles.memberInfo}>
                      <span style={styles.memberName}>
                        {member.users?.first_name} {member.users?.last_name}
                        {member.user_id === user?.id && ' (You)'}
                      </span>
                      {member.role === 'admin' && (
                        <span style={styles.adminBadge}>Admin</span>
                      )}
                    </div>
                    {isAdmin && member.user_id !== user?.id && (
                      <button
                        style={styles.removeMemberBtn}
                        onClick={() => onRemoveMember(chat.id, member.user_id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave Group */}
          {chat.is_group && (
            <button style={styles.leaveBtn} onClick={onLeave}>
              Leave Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Report Modal Component
const ReportModal = ({ onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const reasons = [
    { value: 'harassment', label: 'Harassment' },
    { value: 'spam', label: 'Spam' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>Report Message</h3>
        <p style={styles.modalSubtext}>
          Let us know what's wrong with this message
        </p>

        <div style={styles.reasonOptions}>
          {reasons.map(r => (
            <label key={r.value} style={styles.reasonOption}>
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={(e) => setReason(e.target.value)}
                style={styles.radio}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>

        <textarea
          placeholder="Additional details (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={styles.textarea}
          rows={3}
        />

        <div style={styles.modalButtons}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.submitBtn,
              opacity: reason ? 1 : 0.5
            }}
            onClick={() => onSubmit(reason, description)}
            disabled={!reason}
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Members Modal Component
const AddMembersModal = ({ chat, onClose, onAdd }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const existingIds = chat.members?.map(m => m.user_id) || [];

      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, profile_image_url')
        .not('id', 'in', `(${existingIds.join(',')})`)
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const name = `${u.first_name} ${u.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>Add Members</h3>

        <input
          type="text"
          placeholder="Search people..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInputModal}
        />

        <div style={styles.userListModal}>
          {loading ? (
            <div style={styles.spinner} />
          ) : filtered.length === 0 ? (
            <p style={styles.noUsers}>No users to add</p>
          ) : (
            filtered.map(u => (
              <button
                key={u.id}
                style={{
                  ...styles.userItemModal,
                  backgroundColor: selected.includes(u.id) ? '#eff6ff' : 'transparent'
                }}
                onClick={() => setSelected(prev =>
                  prev.includes(u.id)
                    ? prev.filter(id => id !== u.id)
                    : [...prev, u.id]
                )}
              >
                {u.profile_image_url ? (
                  <img src={u.profile_image_url} alt="" style={styles.userAvatarModal} />
                ) : (
                  <div style={styles.userAvatarPlaceholderModal}>
                    <UserIcon />
                  </div>
                )}
                <span style={styles.userNameModal}>
                  {u.first_name} {u.last_name}
                </span>
                {selected.includes(u.id) && (
                  <CheckIcon />
                )}
              </button>
            ))
          )}
        </div>

        <div style={styles.modalButtons}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.submitBtn,
              opacity: selected.length > 0 ? 1 : 0.5
            }}
            onClick={() => onAdd(selected)}
            disabled={selected.length === 0}
          >
            Add ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    backgroundColor: 'var(--background-off-white)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    position: 'relative',
    zIndex: 10,
  },
  backButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
  },
  headerInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  headerAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  headerAvatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  headerSubtext: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  typingText: {
    fontSize: '12px',
    color: 'var(--primary-blue)',
    fontStyle: 'italic',
  },
  menuButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
  },
  headerMenu: {
    position: 'absolute',
    top: '60px',
    right: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    zIndex: 100,
    minWidth: '180px',
  },
  menuItem: {
    display: 'block',
    width: '100%',
    padding: '14px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    color: 'var(--text-dark)',
    textAlign: 'left',
    cursor: 'pointer',
  },
  messagesContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid var(--primary-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  smallSpinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyMessages: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--text-muted)',
    margin: '0 0 4px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: 'var(--text-light)',
    margin: 0,
  },
  dateDivider: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 0',
  },
  dateDividerText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-light)',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  messageRow: {
    display: 'flex',
    marginBottom: '4px',
  },
  avatarSpace: {
    width: '32px',
    marginRight: '8px',
    flexShrink: 0,
  },
  messageAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  messageAvatarPlaceholder: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  senderName: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--primary-blue)',
    marginBottom: '2px',
    display: 'block',
  },
  messageBubble: {
    padding: '10px 14px',
    borderRadius: '18px',
    position: 'relative',
    cursor: 'pointer',
  },
  ownBubble: {
    backgroundColor: 'var(--primary-blue)',
    borderBottomRightRadius: '4px',
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: '4px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  replyPreview: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: '8px',
    padding: '6px 10px',
    marginBottom: '6px',
  },
  replyName: {
    fontSize: '12px',
    fontWeight: '600',
    display: 'block',
  },
  replyText: {
    fontSize: '12px',
    opacity: 0.8,
  },
  messageImage: {
    maxWidth: '200px',
    borderRadius: '8px',
    marginBottom: '4px',
    cursor: 'pointer',
  },
  fileAttachment: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: '8px',
    color: 'inherit',
    marginBottom: '4px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '14px',
  },
  messageText: {
    fontSize: '15px',
    lineHeight: '1.4',
    margin: 0,
    wordBreak: 'break-word',
  },
  messageFooter: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '4px',
  },
  messageTime: {
    fontSize: '11px',
  },
  reactionsRow: {
    display: 'flex',
    gap: '4px',
    marginTop: '4px',
    flexWrap: 'wrap',
  },
  reactionBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'var(--bg-light)',
    borderRadius: '12px',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
  },
  messageActions: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: '8px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    zIndex: 50,
  },
  quickReactions: {
    display: 'flex',
    padding: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  reactionBtn: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    borderRadius: '8px',
  },
  actionButtons: {
    padding: '4px',
  },
  actionBtn: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    color: 'var(--text-dark)',
    textAlign: 'left',
    cursor: 'pointer',
  },
  inputArea: {
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    padding: '12px 16px',
    paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 4px))',
  },
  editingBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    color: 'var(--primary-blue)',
  },
  cancelEdit: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--primary-blue)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  attachButton: {
    padding: '10px',
    backgroundColor: 'var(--bg-light)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: 'var(--background-off-white)',
    fontSize: '15px',
    outline: 'none',
  },
  sendButton: {
    padding: '12px',
    backgroundColor: 'var(--primary-blue)',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Drawer styles
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: '100%',
    maxWidth: '360px',
    backgroundColor: '#ffffff',
    height: '100%',
    overflow: 'auto',
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
    borderBottom: '1px solid #e2e8f0',
  },
  drawerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  closeBtn: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
  },
  drawerContent: {
    padding: '20px',
  },
  drawerProfile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px',
  },
  drawerAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '12px',
  },
  drawerAvatarPlaceholder: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
    marginBottom: '12px',
  },
  drawerName: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
    textAlign: 'center',
  },
  editHint: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-light)',
    fontWeight: '400',
    marginTop: '4px',
  },
  editNameRow: {
    display: 'flex',
    gap: '8px',
  },
  nameInput: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '16px',
    textAlign: 'center',
    outline: 'none',
  },
  saveNameBtn: {
    padding: '8px 12px',
    backgroundColor: 'var(--primary-blue)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#ffffff',
    display: 'flex',
  },
  membersSection: {
    marginTop: '24px',
  },
  membersSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  addMemberBtn: {
    padding: '6px 12px',
    backgroundColor: '#eff6ff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--primary-blue)',
    cursor: 'pointer',
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    borderRadius: '8px',
  },
  memberAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  memberAvatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  memberInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  memberName: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-dark)',
  },
  adminBadge: {
    fontSize: '11px',
    padding: '2px 6px',
    backgroundColor: '#dbeafe',
    color: 'var(--primary-blue)',
    borderRadius: '4px',
    fontWeight: '500',
  },
  removeMemberBtn: {
    padding: '6px 10px',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#ef4444',
    cursor: 'pointer',
  },
  leaveBtn: {
    width: '100%',
    marginTop: '24px',
    padding: '14px',
    backgroundColor: '#fee2e2',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#ef4444',
    cursor: 'pointer',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  modalSubtext: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '0 0 20px 0',
  },
  reasonOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  reasonOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  radio: {
    width: '18px',
    height: '18px',
    accentColor: 'var(--primary-blue)',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'var(--bg-light)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'var(--primary-blue)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
    cursor: 'pointer',
  },
  searchInputModal: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  userListModal: {
    maxHeight: '300px',
    overflow: 'auto',
    marginBottom: '16px',
  },
  userItemModal: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  userAvatarModal: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  userAvatarPlaceholderModal: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  userNameModal: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-dark)',
  },
  noUsers: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '20px',
  },
};

export default ChatConversation;
