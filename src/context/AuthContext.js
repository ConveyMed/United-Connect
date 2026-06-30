import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { get, set, del } from 'idb-keyval';
import { logoutOneSignal } from '../services/onesignal';
// Note: OneSignal initialization is now handled by dedicated components in App.js

const AuthContext = createContext({});

// Keys for cached auth data
const CACHED_USER_KEY = 'cached_auth_user';
const CACHED_PROFILE_KEY = 'cached_auth_profile';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const profileFetchRef = useRef(null);

  // Fetch profile when user changes
  useEffect(() => {
    if (!authChecked) return; // Wait for auth to be checked first

    if (!user?.id) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // Keep loading true while fetching profile
    setLoading(true);

    if (profileFetchRef.current) {
      profileFetchRef.current.cancelled = true;
    }

    const fetchProfile = async () => {
      const fetchState = { cancelled: false };
      profileFetchRef.current = fetchState;

      // Check if offline
      const isOffline = !navigator.onLine;

      if (isOffline) {
        // Load cached profile when offline
        try {
          const cachedProfile = await get(CACHED_PROFILE_KEY);
          if (cachedProfile && cachedProfile.id === user.id) {
            setUserProfile(cachedProfile);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log('Error loading cached profile:', e);
        }
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchState.cancelled) return;

        if (error) {
          console.log('Profile fetch error:', error);
          // Try cached profile on error
          const cachedProfile = await get(CACHED_PROFILE_KEY);
          if (cachedProfile && cachedProfile.id === user.id) {
            setUserProfile(cachedProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
          return;
        }

        // Cache the profile for offline use
        await set(CACHED_PROFILE_KEY, profile);
        setUserProfile(profile);
        setLoading(false);
      } catch (err) {
        console.log('Profile fetch error:', err);
        // Try cached profile on error
        try {
          const cachedProfile = await get(CACHED_PROFILE_KEY);
          if (cachedProfile && cachedProfile.id === user.id) {
            setUserProfile(cachedProfile);
          } else {
            setUserProfile(null);
          }
        } catch (e) {
          setUserProfile(null);
        }
        setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      if (profileFetchRef.current) {
        profileFetchRef.current.cancelled = true;
      }
    };
  }, [user?.id, authChecked]);

  // Main auth effect
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const isOffline = !navigator.onLine;

      if (isOffline) {
        // Offline: try to load cached user
        try {
          const cachedUser = await get(CACHED_USER_KEY);
          if (cachedUser) {
            setUser(cachedUser);
          } else {
            setUser(null);
          }
        } catch (e) {
          console.log('Error loading cached user:', e);
          setUser(null);
        }
        setAuthChecked(true);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.log('getSession error:', error);
          // Try cached user on error
          const cachedUser = await get(CACHED_USER_KEY);
          if (cachedUser) {
            setUser(cachedUser);
          } else {
            setUser(null);
          }
          setAuthChecked(true);
          return;
        }

        if (session) {
          // Cache user for offline use
          await set(CACHED_USER_KEY, session.user);
          setUser(session.user);
          // OneSignal initialization handled by dedicated components in App.js
        } else {
          setUser(null);
        }

        setAuthChecked(true);
      } catch (err) {
        console.log('Auth init error:', err);
        // Try cached user on error
        try {
          const cachedUser = await get(CACHED_USER_KEY);
          if (cachedUser) {
            setUser(cachedUser);
          }
        } catch (e) {
          // Ignore cache error
        }
        setAuthChecked(true);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        logoutOneSignal();
      } else if (session) {
        setUser(session.user);
        // OneSignal device registration handled by DeviceRegistration component in App.js
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user?.id) return;

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.log('Refresh profile error:', error);
        return;
      }

      setUserProfile(profile);
    } catch (err) {
      console.log('Refresh error:', err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Logout from OneSignal
    await logoutOneSignal();
    // Clear cached auth data
    try {
      await del(CACHED_USER_KEY);
      await del(CACHED_PROFILE_KEY);
    } catch (e) {
      console.log('Error clearing cached auth:', e);
    }
    // Clear org code verification
    localStorage.setItem('org_code_verified', 'false');
    setUser(null);
    setUserProfile(null);
  };

  const resetIntake = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_complete: false })
        .eq('id', user.id);

      if (error) {
        console.log('Reset intake error:', error);
        return;
      }

      // Update local state
      setUserProfile(prev => prev ? { ...prev, profile_complete: false } : null);
    } catch (err) {
      console.log('Reset intake error:', err);
    }
  };

  const isAuthenticated = !!user;
  const isProfileComplete = userProfile?.profile_complete === true;

  const value = {
    user,
    userProfile,
    loading,
    refreshProfile,
    signOut,
    resetIntake,
    isAuthenticated,
    isProfileComplete
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
