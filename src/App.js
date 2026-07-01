import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { injectTheme } from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PostsProvider } from './context/PostsContext';
import { ContentProvider } from './context/ContentContext';
import { DownloadsProvider } from './context/DownloadsContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { OfflineProvider, useOffline } from './context/OfflineContext';
import { ActivityNotificationsProvider } from './context/ActivityNotificationsContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import {
  initializeOneSignalSDK,
  registerDeviceForUser,
  checkAndRequestPermission
} from './services/onesignal';
import { supabase } from './config/supabase';
import Login from './onboarding/Login';
import SignUp from './onboarding/SignUp';
import EmailConfirmation from './onboarding/EmailConfirmation';
import EmailConfirmed from './pages/EmailConfirmed';
import ForgotPassword from './onboarding/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProfileComplete from './onboarding/ProfileComplete';
import Home from './pages/Home';
import Profile from './pages/Profile';
import NotificationSettings from './pages/NotificationSettings';
import EditProfile from './pages/EditProfile';
import ManageUsers from './pages/ManageUsers';
import Directory from './pages/Directory';
import DirectoryPermissions from './pages/DirectoryPermissions';
import Resources from './pages/Resources';
import ManageForms from './pages/ManageForms';
import ManageLibrary from './pages/ManageLibrary';
import ManageTraining from './pages/ManageTraining';
import ManageAI from './pages/ManageAI';
import Downloads from './pages/Downloads';
import FileViewer from './pages/FileViewer';
import Chat from './pages/Chat';
import ChatConversation from './pages/ChatConversation';
import ManageChat from './pages/ManageChat';
import ManageAnalytics from './pages/ManageAnalytics';
import { TermsAndConditions, PrivacyPolicy, DeleteAccount } from './pages/LegalSupport';
import Support from './pages/Support';
import BottomNav from './components/BottomNav';
import AIChatPanel from './components/AIChatPanel';
import OfflineLoginScreen from './components/OfflineLoginScreen';
import OfflineScreen from './components/OfflineScreen';
import { AIChatProvider } from './context/AIChatContext';
import { AnalyticsProvider } from './context/AnalyticsContext';
import { ChatProvider } from './context/ChatContext';
import CreatePostModal from './components/CreatePostModal';
import OrganizationGate from './pages/OrganizationGate';
import ManageOrgCode from './pages/ManageOrgCode';
// Field Intel — ships dark by default; lights up when ENABLE_FIELD_INTEL is true.
import { ENABLE_FIELD_INTEL } from './config/features';
import { FieldIntelProvider, useFieldIntel } from './field-intel/FieldIntelContext';
import { FieldIntelNotificationsProvider } from './context/FieldIntelNotificationsContext';
import FieldIntelZone from './field-intel/FieldIntelZone';
import FieldIntelPlaceholder from './field-intel/FieldIntelPlaceholder';
import CSVImport from './field-intel/admin/CSVImport';
import RegionManager from './field-intel/admin/RegionManager';
import RegionAccountAssigner from './field-intel/admin/RegionAccountAssigner';
import HierarchyOrgChart from './field-intel/admin/HierarchyOrgChart';
import CustomFieldManager from './field-intel/admin/CustomFieldManager';
import DelegationScreen from './field-intel/DelegationScreen';
import SurgeonList from './field-intel/SurgeonList';
import SurgeonDossier from './field-intel/SurgeonDossier';
import CallLogHistory from './field-intel/CallLogHistory';
import CallLogEntry from './field-intel/CallLogEntry';
import LeadQueue from './field-intel/LeadQueue';
import LeadSubmit from './field-intel/LeadSubmit';
import ChangeRequest from './field-intel/ChangeRequest';
import DrillDownView from './field-intel/DrillDownView';
import PipelineView from './field-intel/PipelineView';
import DealReview from './field-intel/DealReview';
import RepDashboard from './field-intel/dashboards/RepDashboard';
import ManagerDashboard from './field-intel/dashboards/ManagerDashboard';
import VPDashboard from './field-intel/dashboards/VPDashboard';
import AdminDashboard from './field-intel/dashboards/AdminDashboard';
import ActivityFeed from './field-intel/dashboards/ActivityFeed';
import './App.css';

// Routes that should NOT show bottom nav. Field Intel runs its own in-zone nav,
// so the global bottom nav is hidden across the whole /field-intel subtree.
const noNavRoutes = ['/', '/signup', '/confirm-email', '/email-confirmed', '/forgot-password', '/reset-password', '/profile-complete', ...(ENABLE_FIELD_INTEL ? ['/field-intel'] : [])];

// ============================================
// OneSignal Components
// ============================================

/**
 * OneSignalInitializer - Initialize SDK once on app start
 * Runs before auth, just sets up the SDK
 */
const OneSignalInitializer = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializeOneSignalSDK();
    }
  }, []);

  return null;
};

/**
 * DeviceRegistration - Register device after user authenticates
 * Re-runs whenever user changes
 */
const DeviceRegistration = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    // Register device for push notifications
    registerDeviceForUser(user.id);
  }, [user]);

  return null;
};

/**
 * ReturningUserPermissions - Check permissions for returning users
 * Handles: new device, reinstall, skipped onboarding on different device
 */
const ReturningUserPermissions = () => {
  const { user, isProfileComplete } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || !isProfileComplete || hasChecked) return;

    const checkPermissions = async () => {
      try {
        // Check if user has completed profile (meaning they went through onboarding)
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!userData) {
          console.log('[Permissions] User not found in users table yet');
          setHasChecked(true);
          return;
        }

        // User exists and profile is complete - they're a returning user
        // Check and request permission if needed
        console.log('[Permissions] Checking permissions for returning user...');
        await checkAndRequestPermission(user.id);
        setHasChecked(true);

      } catch (err) {
        console.error('[Permissions] Error:', err);
        setHasChecked(true);
      }
    };

    // Delay to let app stabilize
    const timer = setTimeout(checkPermissions, 2000);
    return () => clearTimeout(timer);
  }, [user, isProfileComplete, hasChecked]);

  return null;
};

// App shell wrapper - fixed shell with scrollable content area
const AppShell = ({ children, showNav = false }) => {
  return (
    <div className="app-shell">
      <div className="app-content">
        {children}
      </div>
      {showNav && <BottomNav />}
      {showNav && <CreatePostModal />}
    </div>
  );
};

// Routes allowed when offline (after auth)
const offlineAllowedRoutes = ['/downloads', '/view-file'];

// ============================================
// Field Intel helpers (only rendered when ENABLE_FIELD_INTEL is true)
// ============================================
// Role-based dashboard wrapper: picks the right dashboard based on hierarchy role.
const RoleDashboard = () => {
  const { role } = useFieldIntel();
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'vp') return <VPDashboard />;
  if (role === 'manager') return <ManagerDashboard />;
  if (role === 'rep') return <RepDashboard />;
  return <FieldIntelPlaceholder label="Dashboard" />;
};

// Gate Field Intel admin screens so reps can't reach them via URL.
const RequireManagerOrAbove = ({ children }) => {
  const { role, isActualAdmin, loading } = useFieldIntel();
  if (loading) return null;
  if (isActualAdmin) return children;
  if (role === 'manager' || role === 'vp') return children;
  return <Navigate to="/field-intel" replace />;
};

// Wraps the app in Field Intel providers ONLY when the feature is enabled.
// When dark, the providers never mount, so no intel queries/realtime run.
const IntelProviders = ({ children }) =>
  ENABLE_FIELD_INTEL ? (
    <FieldIntelProvider>
      <FieldIntelNotificationsProvider>{children}</FieldIntelNotificationsProvider>
    </FieldIntelProvider>
  ) : (
    children
  );

function AppContent() {
  const { loading, isAuthenticated, isProfileComplete, userProfile, refreshProfile } = useAuth();
  const isAdmin = userProfile?.is_admin === true;
  const { isOffline } = useOffline();
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [orgCodeVerified, setOrgCodeVerified] = useState(() =>
    localStorage.getItem('org_code_verified') === 'true'
  );

  // Check for signup confirmation in URL hash and redirect to email-confirmed page
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=signup') && location.pathname !== '/email-confirmed') {
      // Clear the hash and redirect to email-confirmed
      window.history.replaceState(null, '', window.location.pathname);
      navigate('/email-confirmed', { replace: true });
    }
    // Password recovery: capture the session from the hash tokens BEFORE clearing the URL,
    // then send the user to the reset screen. (Previously it cleared the hash without
    // setting the session, so ResetPassword had no session -> "Auth session missing".)
    if (hash && hash.includes('type=recovery')) {
      const hp = new URLSearchParams(hash.replace(/^#/, ''));
      const at = hp.get('access_token');
      const rt = hp.get('refresh_token');
      if (at && rt) {
        supabase.auth.setSession({ access_token: at, refresh_token: rt });
      }
      window.history.replaceState(null, '', '/reset-password');
      if (location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
      }
    }
    // Check for email change confirmation
    if (hash && hash.includes('type=email_change')) {
      // Clear the hash
      window.history.replaceState(null, '', window.location.pathname);
      // Show success toast
      setToast({ type: 'success', message: 'Email address updated successfully!' });
      // Auto-hide after 4 seconds
      setTimeout(() => setToast(null), 4000);
      // Sync email to users table and refresh profile
      const syncEmail = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('users').update({ email: user.email }).eq('id', user.id);
        }
        refreshProfile();
      };
      syncEmail();
    }
  }, [location.pathname, navigate, refreshProfile]);

  // Handle deep links — Universal/App Links route into the native app
  useEffect(() => {
    const handleAppUrlOpen = async (event) => {
      if (!event?.url) return;

      try {
        const url = new URL(event.url);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (type === 'recovery' && accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          navigate('/reset-password', { replace: true });
          return;
        }

        if (url.pathname === '/confirm-email' || location.pathname === '/confirm-email') {
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('Deep link handling failed:', err);
      }
    };

    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen);

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [location.pathname, navigate]);

  // Handle push notification deep links - navigate to relevant screen when notification tapped
  useEffect(() => {
    if (!isAuthenticated || !isProfileComplete) return;

    const handlePendingDeepLink = () => {
      const pendingData = localStorage.getItem('pendingDeepLink');
      if (!pendingData) return;

      try {
        const data = JSON.parse(pendingData);
        localStorage.removeItem('pendingDeepLink');

        // Navigate based on notification type
        switch (data.type) {
          case 'new_post':
          case 'post_liked':
          case 'post_commented':
          case 'comment_replied':
            // Navigate to home, refresh posts, and scroll to the relevant post
            navigate('/home');
            window.dispatchEvent(new CustomEvent('refreshPosts'));
            if (data.post_id) {
              setTimeout(() => {
                const postElement = document.getElementById(`post-${data.post_id}`);
                if (postElement) {
                  postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  postElement.style.boxShadow = '0 0 0 3px var(--primary-blue)';
                  setTimeout(() => { postElement.style.boxShadow = 'none'; }, 2000);
                }
              }, 500);
            }
            break;

          case 'direct_message':
          case 'group_message':
            if (data.chat_id) {
              navigate(`/chat/${data.chat_id}`);
            } else {
              navigate('/chat');
            }
            break;

          case 'chat_member_added':
          case 'chat_member_removed':
            navigate('/chat');
            break;

          case 'new_update':
          case 'new_event':
          case 'event_rsvp':
            navigate('/home');
            break;

          case 'new_user_joined':
            navigate('/manage-users');
            break;

          default:
            console.log('[DeepLink] Unknown notification type:', data.type);
        }
      } catch (err) {
        console.error('[DeepLink] Error processing pending deep link:', err);
        localStorage.removeItem('pendingDeepLink');
      }
    };

    // Check on mount and when app returns to foreground
    handlePendingDeepLink();

    const handleAppStateChange = (state) => {
      if (state.isActive) {
        handlePendingDeepLink();
      }
    };

    CapacitorApp.addListener('appStateChange', handleAppStateChange);

    return () => {
      // Listener cleanup handled by removeAllListeners above
    };
  }, [isAuthenticated, isProfileComplete, navigate]);

  // Determine if bottom nav should show
  const isFieldIntelRoute = ENABLE_FIELD_INTEL && location.pathname.startsWith('/field-intel');
  const showBottomNav = isAuthenticated && isProfileComplete && !noNavRoutes.includes(location.pathname) && !isFieldIntelRoute;

  // Check if current route is allowed offline
  const isOfflineAllowed = offlineAllowedRoutes.some(route =>
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  // Public pages bypass org code gate
  const publicRoutes = ['/support', '/terms', '/privacy'];
  const isPublicRoute = publicRoutes.some(route => location.pathname === route);

  // Show organization code gate before anything else (no auth required)
  if (!orgCodeVerified && !isPublicRoute) {
    return (
      <OrganizationGate onVerified={() => {
        localStorage.setItem('org_code_verified', 'true');
        setOrgCodeVerified(true);
      }} />
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid var(--primary-blue)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  // Show offline login screen when offline and not authenticated
  if (isOffline && !isAuthenticated) {
    return <OfflineLoginScreen />;
  }

  // Show offline screen when offline and on a non-allowed route
  if (isOffline && isAuthenticated && isProfileComplete && !isOfflineAllowed) {
    return <OfflineScreen />;
  }

  return (
    <div style={{ overflow: 'hidden', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 'calc(20px + env(safe-area-inset-top, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: toast.type === 'success' ? '#059669' : '#dc2626',
          color: '#ffffff',
          padding: '14px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '15px',
          fontWeight: '500',
          maxWidth: '90%',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {toast.message}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Routes>
          {/* Public Routes - Only accessible when NOT logged in */}
          <Route path="/" element={
            isAuthenticated
              ? (isProfileComplete ? <Navigate to="/home" replace /> : <Navigate to="/profile-complete" replace />)
              : <AppShell><Login /></AppShell>
          } />
          <Route path="/signup" element={
            isAuthenticated
              ? (isProfileComplete ? <Navigate to="/home" replace /> : <Navigate to="/profile-complete" replace />)
              : <AppShell><SignUp /></AppShell>
          } />
          <Route path="/confirm-email" element={
            isAuthenticated
              ? (isProfileComplete ? <Navigate to="/home" replace /> : <Navigate to="/profile-complete" replace />)
              : <AppShell><EmailConfirmation /></AppShell>
          } />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
          <Route path="/forgot-password" element={<AppShell><ForgotPassword /></AppShell>} />
          <Route path="/reset-password" element={<AppShell><ResetPassword /></AppShell>} />

          {/* Profile Complete - Only when authenticated but profile incomplete */}
          <Route path="/profile-complete" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : isProfileComplete
                ? <Navigate to="/home" replace />
                : <AppShell><ProfileComplete onComplete={refreshProfile} /></AppShell>
          } />

          {/* Protected Routes - Only accessible when logged in AND profile complete */}
          <Route path="/home" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Home /></AppShell>
          } />
          <Route path="/profile" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Profile /></AppShell>
          } />
          <Route path="/notifications" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><NotificationSettings /></AppShell>
          } />
          <Route path="/edit-profile" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><EditProfile /></AppShell>
          } />
          <Route path="/manage-users" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageUsers /></AppShell>
          } />
          <Route path="/directory" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Directory /></AppShell>
          } />
          <Route path="/directory-permissions" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><DirectoryPermissions /></AppShell>
          } />
          <Route path="/resources" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Resources /></AppShell>
          } />
          <Route path="/library" element={<Navigate to="/resources" replace />} />
          <Route path="/training" element={<Navigate to="/resources" replace />} />
          <Route path="/manage-forms" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageForms /></AppShell>
          } />
          <Route path="/manage-library" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageLibrary /></AppShell>
          } />
          <Route path="/manage-training" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageTraining /></AppShell>
          } />
          <Route path="/manage-ai" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageAI /></AppShell>
          } />
          <Route path="/downloads" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Downloads /></AppShell>
          } />
          <Route path="/view-file/:id" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <FileViewer />
          } />
          <Route path="/chat" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><Chat /></AppShell>
          } />
          <Route path="/chat/:chatId" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <ChatConversation />
          } />
          <Route path="/manage-chat" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><ManageChat /></AppShell>
          } />
          <Route path="/manage-org-code" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : !isAdmin
                  ? <Navigate to="/home" replace />
                  : <AppShell showNav={showBottomNav}><ManageOrgCode /></AppShell>
          } />
          <Route path="/manage-analytics/*" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <ManageAnalytics />
          } />
          {/* Public pages - no auth required */}
          <Route path="/support" element={<Support />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/delete-account" element={
            !isAuthenticated
              ? <Navigate to="/" replace />
              : !isProfileComplete
                ? <Navigate to="/profile-complete" replace />
                : <AppShell showNav={showBottomNav}><DeleteAccount /></AppShell>
          } />
          {/* Field Intel Zone — only registered when ENABLE_FIELD_INTEL is true */}
          {ENABLE_FIELD_INTEL && (
            <Route path="/field-intel" element={
              !isAuthenticated
                ? <Navigate to="/" replace />
                : !isProfileComplete
                  ? <Navigate to="/profile-complete" replace />
                  : <FieldIntelZone />
            }>
              <Route index element={<RoleDashboard />} />
              <Route path="territory" element={<RepDashboard />} />
              <Route path="dossier" element={<SurgeonList />} />
              <Route path="dossier/:surgeonId" element={<SurgeonDossier />} />
              <Route path="call-log" element={<CallLogHistory />} />
              <Route path="call-log/new" element={<CallLogEntry />} />
              <Route path="leads" element={<LeadQueue />} />
              <Route path="leads/new" element={<LeadSubmit />} />
              <Route path="change-request/:surgeonId" element={<ChangeRequest />} />
              <Route path="team" element={<ManagerDashboard />} />
              <Route path="activity" element={<ActivityFeed />} />
              <Route path="deal-review" element={<DealReview />} />
              <Route path="dashboard" element={<RoleDashboard />} />
              <Route path="regions" element={<DelegationScreen />} />
              <Route path="drill/:userId" element={<DrillDownView />} />
              <Route path="pipeline/:userId" element={<PipelineView />} />
              <Route path="database" element={<RequireManagerOrAbove><CSVImport /></RequireManagerOrAbove>} />
              <Route path="manage-regions" element={<RequireManagerOrAbove><RegionManager /></RequireManagerOrAbove>} />
              <Route path="accounts" element={<RequireManagerOrAbove><DelegationScreen /></RequireManagerOrAbove>} />
              <Route path="settings/assign-accounts" element={<RequireManagerOrAbove><RegionAccountAssigner /></RequireManagerOrAbove>} />
              <Route path="settings/hierarchy" element={<RequireManagerOrAbove><Navigate to="/field-intel/settings/hierarchy/org-chart" replace /></RequireManagerOrAbove>} />
              <Route path="settings/hierarchy/org-chart" element={<RequireManagerOrAbove><HierarchyOrgChart /></RequireManagerOrAbove>} />
              <Route path="settings/custom-fields" element={<RequireManagerOrAbove><CustomFieldManager /></RequireManagerOrAbove>} />
            </Route>
          )}
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// Inject theme CSS variables on app load
injectTheme();

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppSettingsProvider>
          <OfflineProvider>
            <PostsProvider>
            <ContentProvider>
              <DownloadsProvider>
                <NotificationsProvider>
                  <ActivityNotificationsProvider>
                    <ChatProvider>
                      <AIChatProvider>
                        <AnalyticsProvider>
                          <IntelProviders>
                            {/* OneSignal Components */}
                            <OneSignalInitializer />
                            <DeviceRegistration />
                            <ReturningUserPermissions />
                            {/* Main App */}
                            <AppContent />
                            <AIChatPanel />
                          </IntelProviders>
                        </AnalyticsProvider>
                      </AIChatProvider>
                    </ChatProvider>
                  </ActivityNotificationsProvider>
                </NotificationsProvider>
              </DownloadsProvider>
            </ContentProvider>
            </PostsProvider>
          </OfflineProvider>
        </AppSettingsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
