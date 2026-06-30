import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import './onboarding.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (resetError) {
        throw resetError;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Error sending reset email:', err);
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const goToLogin = () => {
    navigate('/');
  };

  if (isSuccess) {
    return (
      <div className="login-container">
        <div className="confirmation-card">
          <div className="confirmation-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue, #224B6E)" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 7l-10 7L2 7" />
            </svg>
          </div>
          <h1 className="confirmation-title">Check Your Email</h1>
          <p className="confirmation-text">
            We've sent a password reset link to:
          </p>
          <p className="confirmation-email">{email}</p>
          <p className="confirmation-text">
            Click the link in the email to reset your password. If you don't see it, check your spam folder.
          </p>
          <button className="confirmation-back-button" onClick={goToLogin}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-header">
        <h1 className="login-title">Forgot Password</h1>
        <p className="login-subtitle">Enter your email to receive a reset link</p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          maxWidth: '320px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {error}
        </div>
      )}

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
      </div>

      <button
        className="login-primary-button"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <div className="login-loading">
            <div className="login-spinner"></div>
            Sending...
          </div>
        ) : (
          'Send Reset Link'
        )}
      </button>

      <button className="login-forgot-link" onClick={goToLogin}>
        Back to Sign In
      </button>
    </div>
  );
}

export default ForgotPassword;
