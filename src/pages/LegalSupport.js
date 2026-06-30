import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

const APP_NAME = 'United Connect';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const pageStyles = {
  container: {
    minHeight: '100%',
    backgroundColor: 'var(--background-off-white)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    width: '100%',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
    position: 'relative',
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--primary-blue)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'var(--primary-blue)',
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    marginLeft: '8px',
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto',
    height: '2px',
    backgroundColor: 'rgba(var(--primary-blue-rgb), 0.15)',
    borderRadius: '1px',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    overflow: 'auto',
  },
  content: {
    width: '100%',
    maxWidth: '600px',
    padding: '24px 16px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 8px 0',
  },
  paragraph: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'var(--text-muted)',
    margin: '0 0 12px 0',
  },
  lastUpdated: {
    fontSize: '13px',
    color: 'var(--text-light)',
    margin: '0 0 24px 0',
    fontStyle: 'italic',
  },
};

export const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div style={pageStyles.container}>
      <header style={pageStyles.header}>
        <div style={pageStyles.headerInner}>
          <button style={pageStyles.backButton} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={pageStyles.headerTitle}>Terms & Conditions</h1>
        </div>
        <div style={pageStyles.headerBorder} />
      </header>
      <div style={pageStyles.contentContainer}>
        <div style={pageStyles.content}>
          <p style={pageStyles.lastUpdated}>Last updated: February 2026</p>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>1. Acceptance of Terms</h2>
            <p style={pageStyles.paragraph}>
              By accessing or using {APP_NAME}, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>2. User Accounts</h2>
            <p style={pageStyles.paragraph}>
              You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. You must provide accurate and complete information when creating your account.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>3. Acceptable Use</h2>
            <p style={pageStyles.paragraph}>
              You agree not to misuse {APP_NAME} or help anyone else do so. You may not use the application for any unlawful purpose, to transmit harmful content, or to interfere with the operation of the service.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>4. Content Ownership</h2>
            <p style={pageStyles.paragraph}>
              Content you submit to {APP_NAME} remains yours. By posting content, you grant us a license to use, display, and distribute that content within the application. We do not claim ownership of your content.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>5. Termination</h2>
            <p style={pageStyles.paragraph}>
              We may suspend or terminate your access to {APP_NAME} at any time for violations of these terms or for any other reason. You may delete your account at any time through the application settings.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>6. Limitation of Liability</h2>
            <p style={pageStyles.paragraph}>
              {APP_NAME} is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the application.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>7. Governing Law</h2>
            <p style={pageStyles.paragraph}>
              These terms are governed by the laws of the United States. Any disputes arising from these terms will be resolved in accordance with applicable law.
            </p>
          </div>

          <div style={{ height: '100px' }} />
        </div>
      </div>
    </div>
  );
};

export const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div style={pageStyles.container}>
      <header style={pageStyles.header}>
        <div style={pageStyles.headerInner}>
          <button style={pageStyles.backButton} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={pageStyles.headerTitle}>Privacy Policy</h1>
        </div>
        <div style={pageStyles.headerBorder} />
      </header>
      <div style={pageStyles.contentContainer}>
        <div style={pageStyles.content}>
          <p style={pageStyles.lastUpdated}>Last updated: February 2026</p>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>1. Information We Collect</h2>
            <p style={pageStyles.paragraph}>
              {APP_NAME} collects information you provide directly, including your name, email address, profile information, and content you post. We also collect usage data such as device information and app interaction data.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>2. How We Use Your Information</h2>
            <p style={pageStyles.paragraph}>
              We use your information to provide and improve {APP_NAME}, send you notifications, personalize your experience, and communicate with you about the service. We do not sell your personal information to third parties.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>3. Third-Party Services</h2>
            <p style={pageStyles.paragraph}>
              {APP_NAME} uses the following third-party services to operate:
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Supabase</strong> - Database and authentication services. Your account data and content is stored securely on Supabase infrastructure.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>OneSignal</strong> - Push notification delivery. Your device token is shared with OneSignal to enable push notifications.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Bunny CDN</strong> - Media file storage and delivery. Uploaded images and files are stored and served through Bunny CDN.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>4. Data Retention</h2>
            <p style={pageStyles.paragraph}>
              We retain your data for as long as your account is active. When you delete your account, your personal data is permanently removed from our systems. Some anonymized usage data may be retained for analytics purposes.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>5. Your Rights</h2>
            <p style={pageStyles.paragraph}>
              You have the right to access, correct, or delete your personal data at any time. You can export your data or delete your account through the application settings. You may also opt out of push notifications at any time.
            </p>
          </div>

          <div style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>6. Contact Us</h2>
            <p style={pageStyles.paragraph}>
              If you have questions about this privacy policy or how we handle your data, please contact us through the application's support channels.
            </p>
          </div>

          <div style={{ height: '100px' }} />
        </div>
      </div>
    </div>
  );
};

export const DeleteAccount = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;

    setLoading(true);
    setError('');

    try {
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) throw rpcError;
      await signOut();
    } catch (err) {
      console.error('Delete account error:', err);
      setError('Failed to delete account. Please try again or contact support.');
      setLoading(false);
    }
  };

  return (
    <div style={pageStyles.container}>
      <header style={pageStyles.header}>
        <div style={pageStyles.headerInner}>
          <button style={pageStyles.backButton} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <h1 style={{...pageStyles.headerTitle, color: '#dc2626'}}>Delete Account</h1>
        </div>
        <div style={pageStyles.headerBorder} />
      </header>
      <div style={pageStyles.contentContainer}>
        <div style={pageStyles.content}>
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#dc2626',
              margin: '0 0 12px 0',
            }}>
              This action is permanent
            </h2>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#7f1d1d',
              margin: '0 0 8px 0',
            }}>
              Deleting your account will permanently remove:
            </p>
            <ul style={{
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#7f1d1d',
              margin: '0',
              paddingLeft: '20px',
            }}>
              <li>Your profile and account data</li>
              <li>All posts, comments, and likes</li>
              <li>Chat messages and conversations</li>
              <li>Notification preferences and device registrations</li>
              <li>All bookmarks and saved content</li>
            </ul>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          }}>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              margin: '0 0 16px 0',
            }}>
              To confirm, type <strong>DELETE</strong> below:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                letterSpacing: '2px',
              }}
            />
            {error && (
              <p style={{
                fontSize: '13px',
                color: '#dc2626',
                margin: '12px 0 0 0',
              }}>
                {error}
              </p>
            )}
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || loading}
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '16px',
                backgroundColor: confirmText === 'DELETE' ? '#dc2626' : '#e2e8f0',
                color: confirmText === 'DELETE' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
          </div>

          <div style={{ height: '100px' }} />
        </div>
      </div>
    </div>
  );
};
