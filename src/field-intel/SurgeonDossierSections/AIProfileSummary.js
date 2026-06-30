import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';

const AIProfileSummary = ({ profile, surgeonId, surgeonName, onProfileGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('physician-research', {
        body: { surgeon_id: surgeonId },
      });

      if (fnError) {
        let upstreamBody = null;
        if (fnError.context && typeof fnError.context.text === 'function') {
          try { upstreamBody = await fnError.context.text(); } catch { /* ignore */ }
        }
        console.error('[AIProfile] functions.invoke error:', {
          name: fnError.name,
          message: fnError.message,
          status: fnError.context?.status,
          body: upstreamBody,
          surgeonId,
        });
        let parsed = null;
        try { parsed = upstreamBody ? JSON.parse(upstreamBody) : null; } catch { /* not json */ }
        throw new Error(parsed?.error || fnError.message || 'Failed to generate profile');
      }

      if (data?.success && data.profile) {
        onProfileGenerated(data.profile);
      } else {
        console.error('[AIProfile] function returned failure:', data);
        throw new Error(data?.error || 'Failed to generate profile');
      }
    } catch (err) {
      console.error('[AIProfile] Error:', err);
      setError(err.message || 'Failed to generate profile');
    } finally {
      setLoading(false);
    }
  };

  // Auto-trigger on load if no profile exists
  useEffect(() => {
    if (!profile && surgeonId && !loading) {
      generateProfile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <BrainIcon />
          <h3 style={styles.title}>Profile Summary</h3>
        </div>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Researching Dr. {surgeonName}...</span>
          <span style={styles.loadingHint}>This may take 10-20 seconds</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <BrainIcon />
          <h3 style={styles.title}>Profile Summary</h3>
        </div>
        <div style={styles.errorBanner}>
          <span style={styles.errorText}>{error}</span>
        </div>
        <button onClick={generateProfile} style={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  if (!profile) return null;

  const hasValue = (v) => v && v.trim().toLowerCase() !== 'null' && v.trim().toLowerCase() !== 'n/a';

  const pedigree = [
    { label: 'Medical School', value: profile.medical_school },
    { label: 'Residency', value: profile.residency },
    { label: 'Fellowship', value: profile.fellowship },
  ].filter((d) => hasValue(d.value));

  const intel = [
    { label: 'Specialties', value: profile.clinical_specialties },
    { label: 'Key Procedures', value: profile.key_procedures },
    { label: 'Research', value: profile.research_interests },
    { label: 'Publications', value: profile.publications },
    { label: 'Healthgrades', value: profile.healthgrades_score },
    { label: 'Ice Breakers', value: profile.ice_breakers },
    { label: 'News / PR', value: profile.news_pr },
  ].filter((d) => hasValue(d.value));

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <BrainIcon />
        <h3 style={styles.title}>Profile Summary</h3>
        <span style={styles.cachedBadge}>Cached</span>
      </div>

      {profile.summary && (
        <p style={styles.summary}>{profile.summary}</p>
      )}

      {pedigree.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Pedigree</span>
          <div style={styles.detailsGrid}>
            {pedigree.map((d) => (
              <div key={d.label} style={styles.detailRow}>
                <span style={styles.detailLabel}>{d.label}</span>
                <span style={styles.detailValue}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {intel.length > 0 && (
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Clinical Intel</span>
          <div style={styles.detailsGrid}>
            {intel.map((d) => (
              <div key={d.label} style={styles.detailRow}>
                <span style={styles.detailLabel}>{d.label}</span>
                <span style={styles.detailValue}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.footer}>
        {profile.source_url && (
          <a href={profile.source_url} target="_blank" rel="noopener noreferrer" style={styles.footerLink}>Source</a>
        )}
        {profile.cms_url && (
          <a href={profile.cms_url} target="_blank" rel="noopener noreferrer" style={styles.footerLink}>CMS Open Payments</a>
        )}
        {profile.updated_at && (
          <span style={styles.timestamp}>
            Updated: {new Date(profile.updated_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </span>
        )}
      </div>
    </div>
  );
};

const BrainIcon = ({ color = '#1e3a8a', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 1.58.67 3 1.74 4.01L12 18l6.26-6.49A5.48 5.48 0 0 0 20 7.5 5.5 5.5 0 0 0 14.5 2 5.5 5.5 0 0 0 12 2.84 5.5 5.5 0 0 0 9.5 2z" />
    <path d="M12 18v4" />
  </svg>
);

const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    flex: 1,
  },
  cachedBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 0',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #e2e8f0',
    borderTop: '2px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e293b',
  },
  loadingHint: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '6px 10px',
    marginBottom: '8px',
  },
  errorText: {
    fontSize: '12px',
    color: '#b91c1c',
  },
  retryBtn: {
    padding: '4px 10px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  summary: {
    fontSize: '13px',
    color: '#334155',
    lineHeight: '1.5',
    margin: '0 0 8px 0',
  },
  section: {
    marginBottom: '6px',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#1e3a8a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '3px',
    paddingTop: '6px',
    borderTop: '1px solid #f1f5f9',
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'baseline',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    minWidth: '90px',
    flexShrink: 0,
  },
  detailValue: {
    fontSize: '12px',
    color: '#475569',
    lineHeight: '1.4',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '8px',
    paddingTop: '6px',
    borderTop: '1px solid #f1f5f9',
  },
  footerLink: {
    fontSize: '11px',
    color: '#1e3a8a',
    fontWeight: '500',
    textDecoration: 'none',
  },
  timestamp: {
    fontSize: '10px',
    color: '#94a3b8',
    marginLeft: 'auto',
  },
};

export default AIProfileSummary;
