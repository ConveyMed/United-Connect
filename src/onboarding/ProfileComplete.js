import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { notifyNewUserJoined } from '../services/notifications';
import './onboarding.css';

// United Connect membership types (required, single-select). "United Team" is the
// corporate group that appears in the Directory; the other two are field roles.
const MEMBER_TYPES = ['United Team', 'Independent Agents', 'Independent Reps'];

function ProfileComplete({ onComplete }) {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('welcome');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ambiguousName, setAmbiguousName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [memberType, setMemberType] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);

      // Load existing profile data
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        // Pre-fill form with existing data
        if (profile.first_name) setFirstName(profile.first_name);
        if (profile.last_name) setLastName(profile.last_name);
        if (profile.first_name && profile.last_name) {
          setFullName(`${profile.first_name} ${profile.last_name}`);
        }
        if (profile.title) setTitle(profile.title);
        if (profile.phone) setPhone(profile.phone);
        if (profile.member_type) setMemberType(profile.member_type);
        if (profile.bio) setBio(profile.bio);
        if (profile.profile_image_url) setImagePreview(profile.profile_image_url);
      }
    }
  };

  const parseFullName = (name) => {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0 || trimmed === '') {
      return { needsClarification: true, type: 'empty' };
    }

    if (parts.length === 1) {
      return { needsClarification: true, type: 'single', name: parts[0] };
    }

    if (parts.length === 2) {
      return {
        needsClarification: false,
        firstName: parts[0],
        lastName: parts[1]
      };
    }

    return {
      needsClarification: false,
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  };

  const handleNameSubmit = () => {
    const result = parseFullName(fullName);

    if (result.type === 'empty') {
      return;
    }

    if (result.needsClarification) {
      setAmbiguousName(result.name);
      setStep('clarify-first');
    } else {
      setFirstName(result.firstName);
      setLastName(result.lastName);
      setStep('phone');
    }
  };

  const handleClarifyFirst = (isFirstName) => {
    if (isFirstName) {
      setFirstName(ambiguousName);
      setStep('clarify-last');
    } else {
      setLastName(ambiguousName);
      setStep('clarify-first-input');
    }
  };

  const handleFirstNameInput = () => {
    if (firstName.trim()) {
      setStep('phone');
    }
  };

  const handleLastNameInput = () => {
    if (lastName.trim()) {
      setStep('phone');
    }
  };

  const handlePhoneSubmit = () => {
    setStep('membership');
  };

  const handleMembershipSubmit = () => {
    if (memberType) setStep('title');
  };

  const handleTitleSubmit = () => {
    setStep('photo');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSubmit = () => {
    setStep('bio');
  };

  const handleBioSubmit = () => {
    setStep('confirm');
  };

  const handleBack = () => {
    switch (step) {
      case 'clarify-first':
      case 'clarify-last':
      case 'clarify-first-input':
        setFullName('');
        setFirstName('');
        setLastName('');
        setAmbiguousName('');
        setStep('welcome');
        break;
      case 'phone':
        setStep('welcome');
        break;
      case 'membership':
        setStep('phone');
        break;
      case 'title':
        setStep('membership');
        break;
      case 'photo':
        setStep('title');
        break;
      case 'bio':
        setStep('photo');
        break;
      case 'confirm':
        setStep('bio');
        break;
      default:
        setStep('welcome');
    }
  };

  const handleComplete = async () => {
    if (!firstName.trim() || !lastName.trim() || !user) return;

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      // Upload profile image if provided
      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, profileImage);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);
          imageUrl = publicUrl;
        }
      }

      // Build update object - only include profile_image_url if we uploaded a new image
      const updateData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        title: title.trim() || null,
        phone: phone.trim() || null,
        member_type: memberType || null,
        bio: bio.trim() || null,
        profile_complete: true
      };

      // Only update image URL if a new image was uploaded
      if (imageUrl) {
        updateData.profile_image_url = imageUrl;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Notify admins about new user
      notifyNewUserJoined({
        newUserId: user.id,
        newUserName: `${firstName.trim()} ${lastName.trim()}`,
        newUserEmail: user.email,
      }).catch(err => console.error('Notification error:', err));

      if (onComplete) {
        await onComplete();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error saving profile: ' + error.message);
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="profile-container">
      {/* Step 1: Welcome / Name */}
      {step === 'welcome' && (
        <div className="profile-step">
          <div className="profile-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="profile-title">Welcome!</h1>
          <p className="profile-subtitle">Let's set up your profile. What's your name? <span style={{color: 'var(--primary-blue)', fontWeight: '500'}}>(required)</span></p>

          <input
            className="profile-input"
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleNameSubmit)}
            autoFocus
            autoComplete="name"
            autoCapitalize="words"
          />

          <button
            className="profile-primary-button"
            onClick={handleNameSubmit}
            disabled={!fullName.trim()}
          >
            Continue
          </button>
        </div>
      )}

      {/* Name Clarification Steps */}
      {step === 'clarify-first' && (
        <div className="profile-step">
          <h1 className="profile-title">Nice to meet you!</h1>
          <p className="profile-subtitle">
            Is <strong>{ambiguousName}</strong> your first name or last name?
          </p>

          <div className="profile-choice-buttons">
            <button className="profile-choice-button" onClick={() => handleClarifyFirst(true)}>
              First Name
            </button>
            <button className="profile-choice-button" onClick={() => handleClarifyFirst(false)}>
              Last Name
            </button>
          </div>

          <button className="profile-back-button" onClick={handleBack}>Back</button>
        </div>
      )}

      {step === 'clarify-first-input' && (
        <div className="profile-step">
          <h1 className="profile-title">Got it!</h1>
          <p className="profile-subtitle">And what's your first name?</p>

          <input
            className="profile-input"
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleFirstNameInput)}
            autoFocus
            autoCapitalize="words"
          />

          <button
            className="profile-primary-button"
            onClick={handleFirstNameInput}
            disabled={!firstName.trim()}
          >
            Continue
          </button>

          <button className="profile-back-button" onClick={handleBack}>Back</button>
        </div>
      )}

      {step === 'clarify-last' && (
        <div className="profile-step">
          <h1 className="profile-title">Great, {firstName}!</h1>
          <p className="profile-subtitle">And what's your last name?</p>

          <input
            className="profile-input"
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleLastNameInput)}
            autoFocus
            autoCapitalize="words"
          />

          <button
            className="profile-primary-button"
            onClick={handleLastNameInput}
            disabled={!lastName.trim()}
          >
            Continue
          </button>

          <button className="profile-back-button" onClick={handleBack}>Back</button>
        </div>
      )}

      {/* Step 2: Phone Number (Optional) */}
      {step === 'phone' && (
        <div className="profile-step">
          <div className="profile-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <h1 className="profile-title">Hi, {firstName}!</h1>
          <p className="profile-subtitle">What's your phone number? <span style={{color: 'var(--text-light)'}}>(optional)</span></p>

          <input
            className="profile-input"
            type="tel"
            placeholder="(555) 555-5555"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handlePhoneSubmit)}
            autoFocus
            autoComplete="tel"
            inputMode="tel"
          />

          <button className="profile-primary-button" onClick={handlePhoneSubmit}>
            {phone.trim() ? 'Continue' : 'Skip'}
          </button>

          <button className="profile-back-button" onClick={handleBack}>Back</button>
        </div>
      )}

      {/* Step 2.5: Membership Type (Required) */}
      {step === 'membership' && (
        <div className="profile-step">
          <div className="profile-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="profile-title">Which best describes you?</h1>
          <p className="profile-subtitle">Select your role with United Orthopedic.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', margin: '8px 0 4px 0' }}>
            {MEMBER_TYPES.map((type) => {
              const selected = memberType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMemberType(type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '16px 18px',
                    borderRadius: 12,
                    border: selected ? '2px solid #4CAC87' : '2px solid #e2e8f0',
                    backgroundColor: selected ? 'rgba(76, 172, 135, 0.08)' : '#ffffff',
                    color: '#1e293b',
                    fontSize: 16,
                    fontWeight: selected ? 600 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>{type}</span>
                  <span style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: selected ? '6px solid #4CAC87' : '2px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }} />
                </button>
              );
            })}
          </div>

          <button
            className="profile-primary-button"
            onClick={handleMembershipSubmit}
            disabled={!memberType}
            style={!memberType ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            Continue
          </button>

          <button className="profile-back-button" onClick={handleBack}>Back</button>
        </div>
      )}

      {/* Step 3: Title (Optional) */}
      {step === 'title' && (
        <div className="profile-step">
          <div className="profile-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <h1 className="profile-title">Your Role</h1>
          <p className="profile-subtitle">What's your job title? <span style={{color: 'var(--text-light)'}}>(optional)</span></p>

          <input
            className="profile-input"
            type="text"
            placeholder="e.g. Software Engineer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleTitleSubmit)}
            autoFocus
            autoCapitalize="words"
          />

          <button className="profile-primary-button" onClick={handleTitleSubmit}>
            {title.trim() ? 'Continue' : 'Skip'}
          </button>

          <button className="profile-back-button" onClick={handleBack}>Back</button>
        </div>
      )}

      {/* Step 4: Profile Photo (Optional) */}
      {step === 'photo' && (
        <div className="profile-step">
          <h1 className="profile-title">Add a Photo</h1>
          <p className="profile-subtitle">Help your team recognize you <span style={{color: 'var(--text-light)'}}>(optional)</span></p>

          <div className="profile-photo-container">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="profile-photo-preview" />
            ) : (
              <div className="profile-photo-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
          </div>

          <label className="profile-upload-button">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            {imagePreview ? 'Change Photo' : 'Choose Photo'}
          </label>

          <button className="profile-primary-button" onClick={handlePhotoSubmit}>
            {imagePreview ? 'Continue' : 'Skip'}
          </button>

          <button className="profile-back-button" onClick={handleBack}>Back</button>
        </div>
      )}

      {/* Step 5: Bio (Optional) */}
      {step === 'bio' && (
        <div className="profile-step">
          <h1 className="profile-title">About You</h1>
          <p className="profile-subtitle">Write a short bio for your profile <span style={{color: 'var(--text-light)'}}>(optional)</span></p>

          <textarea
            className="profile-textarea"
            placeholder="Tell us a bit about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            autoFocus
          />

          <button className="profile-primary-button" onClick={handleBioSubmit}>
            {bio.trim() ? 'Continue' : 'Skip'}
          </button>

          <button className="profile-back-button" onClick={handleBack}>Back</button>
        </div>
      )}

      {/* Step 6: Confirmation */}
      {step === 'confirm' && (
        <div className="profile-step">
          <div className="profile-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="profile-title">Review Your Profile</h1>
          <p className="profile-subtitle">Make sure everything looks good</p>

          <div className="profile-review-card">
            {imagePreview && (
              <img src={imagePreview} alt="Profile" className="profile-review-photo" />
            )}
            <div className="profile-review-table">
              <div className="profile-review-row">
                <span className="profile-review-label">Name:</span>
                <span className="profile-review-value">{firstName} {lastName}</span>
              </div>
              <div className="profile-review-row">
                <span className="profile-review-label">Email:</span>
                <span className="profile-review-value">{user?.email}</span>
              </div>
              {title && (
                <div className="profile-review-row">
                  <span className="profile-review-label">Title:</span>
                  <span className="profile-review-value">{title}</span>
                </div>
              )}
              {phone && (
                <div className="profile-review-row">
                  <span className="profile-review-label">Phone:</span>
                  <span className="profile-review-value">{phone}</span>
                </div>
              )}
              {bio && (
                <div className="profile-review-row bio-row">
                  <span className="profile-review-label">Bio:</span>
                  <span className="profile-review-value">{bio}</span>
                </div>
              )}
            </div>
          </div>

          <button
            className="profile-primary-button"
            onClick={handleComplete}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="profile-loading">
                <div className="profile-spinner"></div>
                Saving...
              </div>
            ) : (
              "Looks Good!"
            )}
          </button>

          <button className="profile-back-button" onClick={handleBack}>
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileComplete;
