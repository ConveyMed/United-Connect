import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import '../onboarding/onboarding.css';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Password requirements
  const requirements = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'Contains a number', test: (p) => /\d/.test(p) },
    { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  ];

  const allRequirementsMet = requirements.every((req) => req.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async () => {
    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      // Sign out after password reset
      await supabase.auth.signOut();
      setIsSuccess(true);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && allRequirementsMet && passwordsMatch) {
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
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l3 3 5-6" />
            </svg>
          </div>
          <h1 className="confirmation-title">Password Reset</h1>
          <p className="confirmation-text">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <button
            className="login-primary-button"
            onClick={goToLogin}
            style={{ marginTop: '24px' }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-header">
        <h1 className="login-title">Reset Password</h1>
        <p className="login-subtitle">Enter your new password</p>
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
        <div className="login-password-wrapper">
          <input
            className="login-input login-password-input"
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="new-password"
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

        <div className="login-password-wrapper">
          <input
            className="login-input login-password-input"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="new-password"
            spellCheck="false"
          />
          <button
            type="button"
            className="login-toggle-button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Password Requirements */}
      <div style={{
        width: '100%',
        maxWidth: '320px',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        border: '1px solid #e2e8f0'
      }}>
        <p style={{
          fontSize: '13px',
          color: '#64748b',
          margin: '0 0 12px 0',
          fontWeight: '500'
        }}>
          Password Requirements:
        </p>
        {requirements.map((req, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: index < requirements.length - 1 ? '8px' : 0
            }}
          >
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: req.test(password) ? '#059669' : '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color 0.2s ease'
            }}>
              {req.test(password) && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </div>
            <span style={{
              fontSize: '13px',
              color: req.test(password) ? '#059669' : '#64748b',
              transition: 'color 0.2s ease'
            }}>
              {req.label}
            </span>
          </div>
        ))}

        {/* Passwords match indicator */}
        {confirmPassword.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: passwordsMatch ? '#059669' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {passwordsMatch ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              )}
            </div>
            <span style={{
              fontSize: '13px',
              color: passwordsMatch ? '#059669' : '#dc2626'
            }}>
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </span>
          </div>
        )}
      </div>

      <button
        className="login-primary-button"
        onClick={handleSubmit}
        disabled={isSubmitting || !allRequirementsMet || !passwordsMatch}
      >
        {isSubmitting ? (
          <div className="login-loading">
            <div className="login-spinner"></div>
            Resetting...
          </div>
        ) : (
          'Reset Password'
        )}
      </button>

      <button className="login-forgot-link" onClick={goToLogin}>
        Back to Sign In
      </button>
    </div>
  );
}

export default ResetPassword;
