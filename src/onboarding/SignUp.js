import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import './onboarding.css';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        console.error('Error creating account:', error);
        alert('Error creating account: ' + error.message);
        setIsCreating(false);
        return;
      }

      // If no session returned (user already exists or edge case), try signing in directly
      if (data.user && !data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password
        });
        if (signInError) {
          alert('Account may already exist. Try signing in instead.');
          navigate('/');
        }
      }
      // If auto-confirmed, AuthContext will handle redirect
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
      setIsCreating(false);
    }
  };

  const goToLogin = () => {
    navigate('/');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSignUp();
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-header">
        <h1 className="signup-title">Create Account</h1>
        <p className="signup-subtitle">Sign up to get started</p>
      </div>

      <div className="signup-input-container">
        <input
          className="signup-input"
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

        <div className="signup-password-wrapper">
          <input
            className="signup-input signup-password-input"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="new-password"
            spellCheck="false"
          />
          <button
            type="button"
            className="signup-toggle-button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="signup-password-wrapper">
          <input
            className="signup-input signup-password-input"
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
            className="signup-toggle-button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button
        className="signup-primary-button"
        onClick={handleSignUp}
        disabled={isCreating}
      >
        {isCreating ? (
          <div className="signup-loading">
            <div className="signup-spinner"></div>
            Creating account...
          </div>
        ) : (
          'Create Account'
        )}
      </button>

      <p className="signup-login-text">
        Already have an account?{' '}
        <button
          className="signup-login-link"
          onClick={goToLogin}
          disabled={isCreating}
        >
          Sign in
        </button>
      </p>
    </div>
  );
}

export default SignUp;
