import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { clear as clearIDB } from 'idb-keyval';
import './onboarding.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.error('Error logging in:', error);
        alert('Login failed: ' + error.message);
        setIsLoggingIn(false);
        return;
      }

      // AuthContext handles redirect via onAuthStateChange
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setIsLoggingIn(false);
    }
  };

  const goToSignUp = () => {
    navigate('/signup');
  };

  const goToForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleClearCache = async () => {
    try {
      await supabase.auth.signOut();
      await clearIDB();
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      window.location.href = '/';
    } catch (err) {
      console.error('Error clearing cache:', err);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <img
          src="/company-logo.png"
          alt="United Orthopedic"
          style={{ width: '220px', maxWidth: '70%', height: 'auto', margin: '0 auto 20px', display: 'block' }}
        />
        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Sign in to continue</p>
      </div>

      <div className="login-input-container">
        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck="false"
          inputMode="email"
        />

        <div className="login-password-wrapper">
          <input
            className="login-input login-password-input"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="current-password"
            spellCheck="false"
          />
          <button
            type="button"
            className="login-toggle-button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button
        className="login-primary-button"
        onClick={handleLogin}
        disabled={isLoggingIn}
      >
        {isLoggingIn ? (
          <div className="login-loading">
            <div className="login-spinner"></div>
            Signing in...
          </div>
        ) : (
          'Sign In'
        )}
      </button>

      <button
        className="login-forgot-link"
        onClick={goToForgotPassword}
        disabled={isLoggingIn}
      >
        Forgot password?
      </button>

      <p className="login-signup-text">
        Don't have an account?{' '}
        <button
          className="login-signup-link"
          onClick={goToSignUp}
          disabled={isLoggingIn}
        >
          Sign up
        </button>
      </p>

      <button
        className="login-forgot-link"
        onClick={handleClearCache}
        disabled={isLoggingIn}
        style={{ marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}
      >
        Having trouble? Clear cache & reload
      </button>
    </div>
  );
}

export default Login;
