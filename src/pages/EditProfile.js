import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const UserIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, userProfile, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [newImage, setNewImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Email & Password
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load existing profile data
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.first_name || '');
      setLastName(userProfile.last_name || '');
      setTitle(userProfile.title || '');
      setPhone(userProfile.phone || '');
      setBio(userProfile.bio || '');
      setImagePreview(userProfile.profile_image_url || null);
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [userProfile, user]);

  // Track changes
  useEffect(() => {
    if (!userProfile) return;

    const changed =
      firstName !== (userProfile.first_name || '') ||
      lastName !== (userProfile.last_name || '') ||
      title !== (userProfile.title || '') ||
      phone !== (userProfile.phone || '') ||
      bio !== (userProfile.bio || '') ||
      newImage !== null ||
      email !== (user?.email || '') ||
      newPassword.length > 0;

    setHasChanges(changed);
  }, [firstName, lastName, title, phone, bio, newImage, userProfile, email, newPassword, user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setNewImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('First name and last name are required');
      return;
    }

    // Validate password if changing
    if (newPassword) {
      if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
    }

    setIsSaving(true);

    try {
      let imageUrl = userProfile?.profile_image_url || null;

      // Upload new image if provided
      if (newImage) {
        const fileExt = newImage.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, newImage);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          throw new Error('Failed to upload image');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const emailChanged = email !== user.email;
      const passwordChanged = newPassword.length > 0;

      // Update email if changed
      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim(),
        });
        if (emailError) throw emailError;
      }

      // Update password if provided
      if (passwordChanged) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) throw passwordError;
      }

      // Update profile (don't update email in users table until confirmed)
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          title: title.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          profile_image_url: imageUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Clear password fields
      setNewPassword('');
      setConfirmPassword('');

      // Refresh profile in context
      await refreshProfile();

      // Show appropriate message
      if (emailChanged && passwordChanged) {
        setSuccessMessage('Password updated. Check your new email to confirm the address change.');
      } else if (emailChanged) {
        setSuccessMessage('Check your new email to confirm the address change.');
        setEmail(user.email);
      } else if (passwordChanged) {
        setSuccessMessage('Password updated successfully.');
        setTimeout(() => navigate(-1), 1500);
        return;
      } else {
        navigate(-1);
        return;
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button style={styles.backButton} onClick={() => navigate(-1)} disabled={isSaving}>
            <BackIcon />
          </button>
          <h1 style={styles.headerTitle}>Edit Profile</h1>
          <button
            style={{
              ...styles.saveButton,
              opacity: hasChanges && !isSaving ? 1 : 0.5,
            }}
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <div style={styles.headerBorder} />
      </header>

      {/* Content */}
      <div style={styles.contentContainer}>
        <div style={styles.content}>
          {/* Profile Photo */}
          <div style={styles.photoSection}>
            <div style={styles.photoWrapper}>
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" style={styles.profileImage} />
              ) : (
                <div style={styles.profilePlaceholder}>
                  <UserIcon />
                </div>
              )}
              <label style={styles.cameraButton}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  disabled={isSaving}
                />
                <CameraIcon />
              </label>
            </div>
            <p style={styles.photoHint}>Tap to change photo</p>
          </div>

          {/* Form Fields */}
          <div style={styles.formSection}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                First Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={styles.input}
                placeholder="Enter first name"
                disabled={isSaving}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Last Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={styles.input}
                placeholder="Enter last name"
                disabled={isSaving}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
                placeholder="e.g. Software Engineer"
                disabled={isSaving}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.input}
                placeholder="(555) 555-5555"
                disabled={isSaving}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={styles.textarea}
                placeholder="Tell us about yourself..."
                rows={4}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Account Settings */}
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Account Settings</h3>

            {successMessage && (
              <div style={styles.successMessage}>
                <CheckIcon />
                <span>{successMessage}</span>
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="Enter email address"
                disabled={isSaving}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                placeholder="Leave blank to keep current"
                disabled={isSaving}
              />
            </div>

            {newPassword && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    ...styles.input,
                    borderColor: confirmPassword && newPassword !== confirmPassword ? '#dc2626' : '#e2e8f0',
                  }}
                  placeholder="Confirm new password"
                  disabled={isSaving}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p style={styles.errorHint}>Passwords do not match</p>
                )}
              </div>
            )}
          </div>

          {/* Bottom padding */}
          <div style={{ height: '40px' }} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
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
    justifyContent: 'space-between',
    padding: '12px 16px 8px 16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  backButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--primary-blue)',
  },
  headerTitle: {
    color: 'var(--primary-blue)',
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--primary-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  headerBorder: {
    maxWidth: '600px',
    margin: '0 auto 16px auto',
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
  photoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  photoWrapper: {
    position: 'relative',
    width: '120px',
    height: '120px',
  },
  profileImage: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid #e2e8f0',
  },
  profilePlaceholder: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-light)',
    border: '4px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
  },
  cameraButton: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-blue)',
    border: '3px solid #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#ffffff',
  },
  photoHint: {
    fontSize: '13px',
    color: 'var(--text-light)',
    marginTop: '12px',
  },
  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    marginBottom: '20px',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  required: {
    color: '#dc2626',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '16px',
    color: 'var(--text-dark)',
    backgroundColor: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '16px',
    color: 'var(--text-dark)',
    backgroundColor: '#ffffff',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  infoValue: {
    fontSize: '14px',
    color: 'var(--text-muted)',
  },
  infoHint: {
    fontSize: '12px',
    color: 'var(--text-light)',
    marginTop: '12px',
    lineHeight: '1.4',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-dark)',
    margin: '0 0 16px 0',
  },
  errorHint: {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '6px',
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '10px',
    marginBottom: '20px',
    color: '#059669',
    fontSize: '14px',
    fontWeight: '500',
  },
};

export default EditProfile;
