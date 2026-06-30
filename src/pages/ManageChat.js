import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';

// Icons
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const FlagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ManageChat = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { settings, updateSetting } = useAppSettings();

  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'settings'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [chatMode, setChatMode] = useState('all_members');

  // Check if user is admin
  useEffect(() => {
    if (userProfile && !userProfile.is_admin) {
      navigate('/home');
    }
  }, [userProfile, navigate]);

  // Load chat mode setting
  useEffect(() => {
    const mode = settings?.chat_mode || 'all_members';
    setChatMode(mode.replace(/"/g, ''));
  }, [settings]);

  // Load reports
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_reports')
        .select(`
          *,
          reported_by_user:users!chat_reports_reported_by_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          reported_user:users!chat_reports_reported_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          chat:chats (
            id,
            name,
            is_group
          ),
          message:messages (
            id,
            content,
            message_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId, status) => {
    try {
      const { error } = await supabase
        .from('chat_reports')
        .update({
          status,
          reviewed_by: userProfile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => prev.map(r =>
        r.id === reportId ? { ...r, status, reviewed_at: new Date().toISOString() } : r
      ));
      setSelectedReport(null);
    } catch (error) {
      console.error('Error updating report:', error);
    }
  };

  const handleChatModeChange = async (mode) => {
    setChatMode(mode);
    await updateSetting('chat_mode', `"${mode}"`);

    // Update localStorage for nav visibility
    localStorage.setItem('showChat', mode !== 'off' ? 'true' : 'false');
    window.dispatchEvent(new Event('navVisibilityChange'));
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  const getReasonLabel = (reason) => {
    const labels = {
      harassment: 'Harassment',
      spam: 'Spam',
      inappropriate: 'Inappropriate Content',
      other: 'Other'
    };
    return labels[reason] || reason;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'resolved':
        return { backgroundColor: '#d1fae5', color: '#065f46' };
      case 'dismissed':
        return { backgroundColor: 'var(--bg-light)', color: 'var(--text-muted)' };
      default:
        return { backgroundColor: 'var(--border-light)', color: '#475569' };
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/profile')}>
          <BackIcon />
        </button>
        <h1 style={styles.headerTitle}>Manage Chat</h1>
      </header>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'reports' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('reports')}
        >
          <FlagIcon />
          <span>Reports</span>
          {pendingCount > 0 && (
            <span style={styles.tabBadge}>{pendingCount}</span>
          )}
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'settings' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon />
          <span>Settings</span>
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'reports' ? (
          <>
            {loading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.spinner} />
                <p style={styles.loadingText}>Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div style={styles.emptyState}>
                <FlagIcon />
                <h3 style={styles.emptyTitle}>No Reports</h3>
                <p style={styles.emptyText}>
                  Chat reports from users will appear here
                </p>
              </div>
            ) : (
              <div style={styles.reportsList}>
                {/* Filter tabs */}
                <div style={styles.filterRow}>
                  <span style={styles.filterLabel}>
                    {reports.length} report{reports.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {reports.map(report => (
                  <div
                    key={report.id}
                    style={styles.reportCard}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div style={styles.reportHeader}>
                      <span style={{
                        ...styles.statusBadge,
                        ...getStatusStyle(report.status)
                      }}>
                        {report.status}
                      </span>
                      <span style={styles.reportDate}>
                        {formatDate(report.created_at)}
                      </span>
                    </div>

                    <div style={styles.reportReason}>
                      <span style={styles.reasonBadge}>
                        {getReasonLabel(report.reason)}
                      </span>
                    </div>

                    <div style={styles.reportDetails}>
                      <div style={styles.reportUser}>
                        <UserIcon />
                        <span>
                          Reported by: {report.reported_by_user?.first_name} {report.reported_by_user?.last_name}
                        </span>
                      </div>
                      {report.reported_user && (
                        <div style={styles.reportUser}>
                          <UserIcon />
                          <span>
                            Against: {report.reported_user?.first_name} {report.reported_user?.last_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {report.message?.content && (
                      <div style={styles.messagePreview}>
                        <MessageIcon />
                        <span>"{report.message.content.substring(0, 100)}..."</span>
                      </div>
                    )}

                    {report.description && (
                      <p style={styles.reportDescription}>
                        {report.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={styles.settingsSection}>
            <h3 style={styles.sectionTitle}>Chat Visibility</h3>
            <p style={styles.sectionDescription}>
              Control who can access the chat feature
            </p>

            <div style={styles.optionsList}>
              <label style={styles.optionItem}>
                <input
                  type="radio"
                  name="chatMode"
                  value="all_members"
                  checked={chatMode === 'all_members'}
                  onChange={() => handleChatModeChange('all_members')}
                  style={styles.radio}
                />
                <div style={styles.optionContent}>
                  <span style={styles.optionLabel}>All Members</span>
                  <span style={styles.optionDescription}>
                    Everyone can use chat
                  </span>
                </div>
              </label>

              <label style={styles.optionItem}>
                <input
                  type="radio"
                  name="chatMode"
                  value="off"
                  checked={chatMode === 'off'}
                  onChange={() => handleChatModeChange('off')}
                  style={styles.radio}
                />
                <div style={styles.optionContent}>
                  <span style={styles.optionLabel}>Disabled</span>
                  <span style={styles.optionDescription}>
                    Chat is hidden from all users
                  </span>
                </div>
              </label>
            </div>

            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                When chat is disabled, the Chat button will be hidden from the navigation menu for all users.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div style={styles.modalOverlay} onClick={() => setSelectedReport(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Report Details</h3>
              <button
                style={styles.closeButton}
                onClick={() => setSelectedReport(null)}
              >
                <XIcon />
              </button>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status</span>
                <span style={{
                  ...styles.statusBadge,
                  ...getStatusStyle(selectedReport.status)
                }}>
                  {selectedReport.status}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Reason</span>
                <span style={styles.detailValue}>
                  {getReasonLabel(selectedReport.reason)}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Reported By</span>
                <span style={styles.detailValue}>
                  {selectedReport.reported_by_user?.first_name} {selectedReport.reported_by_user?.last_name}
                  <span style={styles.detailEmail}>
                    ({selectedReport.reported_by_user?.email})
                  </span>
                </span>
              </div>

              {selectedReport.reported_user && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Reported User</span>
                  <span style={styles.detailValue}>
                    {selectedReport.reported_user?.first_name} {selectedReport.reported_user?.last_name}
                    <span style={styles.detailEmail}>
                      ({selectedReport.reported_user?.email})
                    </span>
                  </span>
                </div>
              )}

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Submitted</span>
                <span style={styles.detailValue}>
                  {formatDate(selectedReport.created_at)}
                </span>
              </div>

              {selectedReport.message?.content && (
                <div style={styles.detailSection}>
                  <span style={styles.detailLabel}>Reported Message</span>
                  <div style={styles.messageBox}>
                    {selectedReport.message.content}
                  </div>
                </div>
              )}

              {selectedReport.description && (
                <div style={styles.detailSection}>
                  <span style={styles.detailLabel}>Additional Details</span>
                  <p style={styles.descriptionText}>
                    {selectedReport.description}
                  </p>
                </div>
              )}

              {selectedReport.status === 'pending' && (
                <div style={styles.actionButtons}>
                  <button
                    style={styles.resolveButton}
                    onClick={() => handleResolveReport(selectedReport.id, 'resolved')}
                  >
                    <CheckIcon />
                    Mark Resolved
                  </button>
                  <button
                    style={styles.dismissButton}
                    onClick={() => handleResolveReport(selectedReport.id, 'dismissed')}
                  >
                    <XIcon />
                    Dismiss
                  </button>
                </div>
              )}

              {selectedReport.reviewed_at && (
                <p style={styles.reviewedText}>
                  Reviewed on {formatDate(selectedReport.reviewed_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--background-off-white)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
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
  headerTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  tabs: {
    display: 'flex',
    padding: '12px 16px',
    gap: '8px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'var(--bg-light)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
  },
  tabBadge: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '8px',
    minWidth: '18px',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    paddingBottom: '100px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid var(--primary-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    color: 'var(--text-light)',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '16px 0 8px',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  reportsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  filterRow: {
    marginBottom: '8px',
  },
  filterLabel: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '6px',
    textTransform: 'capitalize',
  },
  reportDate: {
    fontSize: '12px',
    color: 'var(--text-light)',
  },
  reportReason: {
    marginBottom: '12px',
  },
  reasonBadge: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-dark)',
    backgroundColor: 'var(--bg-light)',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  reportDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
  },
  reportUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  messagePreview: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: 'var(--background-off-white)',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#475569',
    fontStyle: 'italic',
  },
  reportDescription: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.5',
  },
  // Settings section
  settingsSection: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '20px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 4px 0',
  },
  sectionDescription: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: '0 0 20px 0',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  optionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px',
    backgroundColor: 'var(--background-off-white)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  radio: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    accentColor: 'var(--primary-blue)',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--text-dark)',
    marginBottom: '2px',
  },
  optionDescription: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  infoBox: {
    marginTop: '20px',
    padding: '14px',
    backgroundColor: '#eff6ff',
    borderRadius: '10px',
    borderLeft: '3px solid var(--primary-blue)',
  },
  infoText: {
    fontSize: '13px',
    color: 'var(--primary-blue)',
    margin: 0,
    lineHeight: '1.5',
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
    width: '100%',
    maxWidth: '440px',
    maxHeight: '85vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: 0,
  },
  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
  },
  modalContent: {
    padding: '20px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  detailLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '14px',
    color: 'var(--text-dark)',
    textAlign: 'right',
  },
  detailEmail: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-light)',
  },
  detailSection: {
    marginBottom: '16px',
  },
  messageBox: {
    marginTop: '8px',
    padding: '14px',
    backgroundColor: 'var(--background-off-white)',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.5',
  },
  descriptionText: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.5',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  resolveButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dismissButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-muted)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  reviewedText: {
    marginTop: '16px',
    fontSize: '12px',
    color: 'var(--text-light)',
    textAlign: 'center',
  },
};

export default ManageChat;
