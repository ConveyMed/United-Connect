import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabase';
import './onboarding.css';

function EmailConfirmation() {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';

  const handleResendEmail = async () => {
    if (!email || isResending) return;

    setIsResending(true);
    setResendMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        setResendMessage('Failed to resend. Please try again.');
      } else {
        setResendMessage('Email sent! Check your inbox.');
      }
    } catch (err) {
      setResendMessage('Failed to resend. Please try again.');
    }

    setIsResending(false);
  };

  const handleGoToLogin = () => {
    navigate('/');
  };

  return (
    <div className="confirmation-container">
      <div className="confirmation-card">
        <div className="confirmation-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 7l-10 7L2 7" />
          </svg>
        </div>

        <h1 className="confirmation-title">Check Your Email</h1>

        <p className="confirmation-text">
          We sent a confirmation link to:
        </p>

        {email && (
          <p className="confirmation-email">{email}</p>
        )}

        <p className="confirmation-text">
          Click the link in your email to verify your account.
        </p>

        <div className="confirmation-actions">
          <button
            className="confirmation-resend-button"
            onClick={handleResendEmail}
            disabled={isResending || !email}
          >
            {isResending ? 'Sending...' : 'Resend Email'}
          </button>

          {resendMessage && (
            <p className="confirmation-resend-message">{resendMessage}</p>
          )}
        </div>

        <button
          className="confirmation-back-button"
          onClick={handleGoToLogin}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

export default EmailConfirmation;
