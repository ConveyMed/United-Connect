import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import ContactInfo from './SurgeonDossierSections/ContactInfo';
import PracticeInfo from './SurgeonDossierSections/PracticeInfo';
import ProcedureData from './SurgeonDossierSections/ProcedureData';
import MarketIntel from './SurgeonDossierSections/MarketIntel';
import AIProfileSummary from './SurgeonDossierSections/AIProfileSummary';
import CallHistory from './SurgeonDossierSections/CallHistory';
import CustomFields from './SurgeonDossierSections/CustomFields';

const SurgeonDossier = () => {
  const { surgeonId } = useParams();
  const navigate = useNavigate();

  const [surgeon, setSurgeon] = useState(null);
  const [profile, setProfile] = useState(null);
  const [callLogs, setCallLogs] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState([]);
  const [cptData, setCptData] = useState([]);
  const [cptPrices, setCptPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!surgeonId) return;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        const [surgeonRes, profileRes, callsRes, fieldsRes, valuesRes, cptRes, cptPricesRes] = await Promise.all([
          supabase.from('surgeons').select('*').eq('id', surgeonId).single(),
          supabase.from('physician_profiles').select('*').eq('surgeon_id', surgeonId).single(),
          supabase.from('call_logs').select('*, rep:users!call_logs_user_id_fkey(first_name, last_name)').eq('surgeon_id', surgeonId).order('call_date', { ascending: false }),
          supabase.from('custom_fields').select('*').eq('is_active', true).order('sort_order'),
          supabase.from('custom_field_values').select('*').eq('surgeon_id', surgeonId),
          supabase.from('surgeon_cpt_data').select('*').eq('surgeon_id', surgeonId),
          supabase.from('cpt_prices').select('*'),
        ]);

        if (surgeonRes.error) throw surgeonRes.error;
        setSurgeon(surgeonRes.data);

        // Profile may not exist yet - that's ok
        if (!profileRes.error && profileRes.data) {
          setProfile(profileRes.data);
        }

        if (!callsRes.error) setCallLogs(callsRes.data || []);
        if (!fieldsRes.error) setCustomFields(fieldsRes.data || []);
        if (!valuesRes.error) setCustomValues(valuesRes.data || []);
        if (!cptRes.error) setCptData(cptRes.data || []);
        if (!cptPricesRes.error) setCptPrices(cptPricesRes.data || []);
      } catch (err) {
        console.error('[Dossier] Fetch error:', err);
        setError(err.message || 'Failed to load surgeon data');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [surgeonId]);

  const surgeonName = surgeon
    ? (surgeon.full_name || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim() || 'Unknown')
    : '';

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading dossier...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <BackIcon /> Back
        </button>
        <div style={styles.errorCard}>
          <span style={styles.errorText}>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>
        <BackIcon /> Back
      </button>

      <div style={styles.titleRow}>
        <div>
          <h2 style={styles.pageTitle}>{surgeonName}</h2>
          {surgeon?.specialty && <span style={styles.specialtyTag}>{surgeon.specialty}</span>}
        </div>
        <button
          onClick={() => navigate(`/field-intel/change-request/${surgeonId}`)}
          style={styles.changeRequestBtn}
        >
          <EditIcon /> Request Changes
        </button>
      </div>

      <div style={styles.sections}>
        <div style={styles.row}>
          <ContactInfo surgeon={surgeon} />
          <PracticeInfo surgeon={surgeon} />
        </div>
        <ProcedureData surgeon={surgeon} cptData={cptData} cptPrices={cptPrices} />
        <AIProfileSummary
          profile={profile}
          surgeonId={surgeonId}
          surgeonName={surgeonName}
          onProfileGenerated={(p) => setProfile(p)}
        />
        <MarketIntel surgeon={surgeon} />
        <CallHistory
          callLogs={callLogs}
          surgeonId={surgeonId}
          onLogCall={() => navigate(`/field-intel/call-log/new?surgeonId=${surgeonId}`)}
        />
        <CustomFields fields={customFields} values={customValues} />
      </div>
    </div>
  );
};

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  changeRequestBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#ffffff',
    color: '#d97706',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#1e3a8a',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  specialtyTag: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '4px 10px',
    borderRadius: '6px',
    alignSelf: 'flex-start',
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingBottom: '32px',
  },
  row: {
    display: 'flex',
    gap: '8px',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#64748b',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '16px',
  },
  errorText: {
    fontSize: '14px',
    color: '#b91c1c',
  },
};

export default SurgeonDossier;
