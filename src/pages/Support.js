import { useState } from 'react';
import { supabase } from '../config/supabase';

// =============================================================
// CLIENT SETUP REQUIRED
// =============================================================
const APP_NAME = 'United Connect';
const BUG_REPORT_URL = 'https://forms.monday.com/forms/8ca3d8d4267c571e4b687f37ad901b20?r=use1';

const Support = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setSending(true);
    setError('');

    try {
      const { error: fnError } = await supabase.functions.invoke('support-contact', {
        body: { ...form, app_name: APP_NAME },
      });
      if (fnError) throw fnError;
      setSent(true);
    } catch (err) {
      console.error('Support submit error:', err);
      setError('Something went wrong. Please try again or email us directly at mike@conveymed.io');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>{APP_NAME}</h1>
          <p style={styles.subtitle}>Support</p>
        </div>

        <div style={styles.content}>
          <div style={styles.optionsRow}>
            <a href={BUG_REPORT_URL} target="_blank" rel="noopener noreferrer" style={styles.optionCard}>
              <div style={styles.optionIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#004B87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 style={styles.optionTitle}>Report a Bug</h3>
              <p style={styles.optionDesc}>Found something not working right? Let us know and we will fix it.</p>
            </a>

            <div style={styles.optionCard} onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}>
              <div style={styles.optionIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#004B87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 style={styles.optionTitle}>Contact Us</h3>
              <p style={styles.optionDesc}>Have a question or need help? Send us a message and we will get back to you.</p>
            </div>
          </div>

          <div id="contact-form" style={styles.formSection}>
            {sent ? (
              <div style={styles.successBox}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h2 style={styles.successTitle}>Message Sent</h2>
                <p style={styles.successText}>Thanks for reaching out. We will get back to you as soon as possible.</p>
              </div>
            ) : (
              <>
                <h2 style={styles.formTitle}>Send us a message</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.fieldRow}>
                    <div style={styles.field}>
                      <label style={styles.label}>Name</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        style={styles.input}
                        required
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        style={styles.input}
                        required
                      />
                    </div>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Subject</label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      style={styles.input}
                      placeholder="Optional"
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Message</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      style={styles.textarea}
                      rows={5}
                      required
                    />
                  </div>
                  {error && <p style={styles.error}>{error}</p>}
                  <button type="submit" disabled={sending} style={{
                    ...styles.submitBtn,
                    opacity: sending ? 0.6 : 1,
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}>
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>Powered by ConveyMed | <a href="/privacy" style={styles.footerLink}>Privacy Policy</a> | <a href="/terms" style={styles.footerLink}>Terms of Service</a></p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  container: {
    width: '100%',
    maxWidth: '700px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#004B87',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
  },
  content: {},
  optionsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '32px',
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    transition: 'box-shadow 0.2s',
    border: '1px solid #e2e8f0',
  },
  optionIcon: {
    marginBottom: '12px',
  },
  optionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  optionDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5',
  },
  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 20px 0',
  },
  form: {},
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  error: {
    color: '#dc2626',
    fontSize: '13px',
    margin: '0 0 12px 0',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#004B87',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
  },
  successBox: {
    textAlign: 'center',
    padding: '24px',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#059669',
    margin: '16px 0 8px 0',
  },
  successText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  footerLink: {
    color: '#64748b',
    textDecoration: 'none',
  },
};

export default Support;
