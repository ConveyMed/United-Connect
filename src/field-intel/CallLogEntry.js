import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFieldIntel } from './FieldIntelContext';
import { supabase } from '../config/supabase';

const CallLogEntry = () => {
  const { user } = useAuth();
  const { role } = useFieldIntel();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedId = searchParams.get('surgeonId');

  const [surgeons, setSurgeons] = useState([]);
  const [surgeonId, setSurgeonId] = useState(preSelectedId || '');
  const [callDate, setCallDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState('');
  const [buyingStage, setBuyingStage] = useState('');
  const [contractStatus, setContractStatus] = useState('');
  const [forecastDate, setForecastDate] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingSurgeons, setLoadingSurgeons] = useState(true);
  const [surgeonSearch, setSurgeonSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState({});

  // Fetch custom field definitions
  useEffect(() => {
    const fetchCustomFields = async () => {
      const { data } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      setCustomFields(data || []);
    };
    fetchCustomFields();
  }, []);

  // Fetch existing custom values when surgeon changes
  useEffect(() => {
    if (!surgeonId || customFields.length === 0) return;
    const fetchValues = async () => {
      const { data } = await supabase
        .from('custom_field_values')
        .select('field_id, value')
        .eq('surgeon_id', surgeonId);
      const vals = {};
      (data || []).forEach(v => { vals[v.field_id] = v.value; });
      setCustomValues(vals);
    };
    fetchValues();
  }, [surgeonId, customFields]);

  // Fetch assigned surgeons for dropdown
  useEffect(() => {
    if (!user?.id || !role) return;

    const fetch = async () => {
      setLoadingSurgeons(true);
      try {
        let data = [];
        if (role === 'rep') {
          const { data: dels } = await supabase
            .from('account_delegations')
            .select('surgeon_id')
            .eq('user_id', user.id);
          const ids = (dels || []).map(d => d.surgeon_id);
          if (ids.length > 0) {
            const { data: s } = await supabase
              .from('surgeons')
              .select('id, full_name, first_name, last_name, specialty, city, state, buying_stage, contract_status, competitor_products, forecast_close_date')
              .in('id', ids)
              .order('full_name');
            data = s || [];
          }
        } else {
          const { data: s } = await supabase
            .from('surgeons')
            .select('id, full_name, first_name, last_name, specialty, city, state, buying_stage, contract_status, competitor_products, forecast_close_date')
            .order('full_name');
          data = s || [];
        }
        setSurgeons(data);

        // Pre-fill update fields if surgeon is pre-selected
        if (preSelectedId) {
          const selected = data.find(s => s.id === preSelectedId);
          if (selected) {
            prefillFromSurgeon(selected);
          }
        }
      } catch (err) {
        console.error('[CallLogEntry] Error fetching surgeons:', err);
      } finally {
        setLoadingSurgeons(false);
      }
    };
    fetch();
  }, [user?.id, role, preSelectedId]);

  const prefillFromSurgeon = (s) => {
    if (s.buying_stage) setBuyingStage(s.buying_stage);
    if (s.contract_status) setContractStatus(s.contract_status);
    if (s.competitor_products) setCompetitor(s.competitor_products);
    if (s.forecast_close_date) setForecastDate(s.forecast_close_date);
  };

  const handleSurgeonSelect = (s) => {
    setSurgeonId(s.id);
    setSurgeonSearch(s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim());
    setShowDropdown(false);
    prefillFromSurgeon(s);
  };

  const selectedSurgeon = surgeons.find(s => s.id === surgeonId);
  const selectedName = selectedSurgeon
    ? (selectedSurgeon.full_name || `${selectedSurgeon.first_name || ''} ${selectedSurgeon.last_name || ''}`.trim())
    : '';

  const filteredSurgeons = surgeonSearch.trim()
    ? surgeons.filter(s => {
        const name = (s.full_name || `${s.first_name || ''} ${s.last_name || ''}`).toLowerCase();
        return name.includes(surgeonSearch.toLowerCase());
      })
    : surgeons;

  const handleSubmit = async () => {
    if (!surgeonId || !summary.trim()) return;
    setSaving(true);

    try {
      // 1. Insert call log
      const callRow = {
        surgeon_id: surgeonId,
        user_id: user.id,
        call_date: callDate,
        summary: summary.trim(),
        buying_stage_update: buyingStage || null,
        contract_status_update: contractStatus || null,
        forecast_close_date_update: forecastDate || null,
        competitor_update: competitor || null,
        follow_up_date: followUpDate || null,
      };

      const { data: insertedRow, error: insertErr } = await supabase
        .from('call_logs')
        .insert(callRow)
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      // Fire-and-forget: notify teammates assigned to this surgeon (per_log push subscribers).
      // Failure here must not block the call-log save.
      if (insertedRow?.id) {
        supabase.functions
          .invoke('send-call-log-push', {
            body: {
              call_log_id: insertedRow.id,
              surgeon_id: surgeonId,
              author_user_id: user.id,
            },
          })
          .catch((err) => console.error('[CallLogEntry] push notify failed:', err));
      }

      // 2. Update surgeon record if any fields changed
      const updates = {};
      if (buyingStage && buyingStage !== selectedSurgeon?.buying_stage) {
        updates.buying_stage = buyingStage;
      }
      if (contractStatus && contractStatus !== selectedSurgeon?.contract_status) {
        updates.contract_status = contractStatus;
      }
      if (forecastDate && forecastDate !== selectedSurgeon?.forecast_close_date) {
        updates.forecast_close_date = forecastDate;
      }
      if (competitor && competitor !== selectedSurgeon?.competitor_products) {
        updates.competitor_products = competitor;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await supabase
          .from('surgeons')
          .update(updates)
          .eq('id', surgeonId);
        if (updateErr) console.error('[CallLogEntry] Surgeon update error:', updateErr);
      }

      // 3. Upsert custom field values
      const cfUpserts = Object.entries(customValues)
        .filter(([, val]) => val != null && val !== '')
        .map(([fieldId, value]) => ({
          surgeon_id: surgeonId,
          field_id: fieldId,
          value: String(value),
        }));

      if (cfUpserts.length > 0) {
        const { error: cfErr } = await supabase
          .from('custom_field_values')
          .upsert(cfUpserts, { onConflict: 'surgeon_id,field_id' });
        if (cfErr) console.error('[CallLogEntry] Custom field save error:', cfErr);
      }

      // Navigate back
      if (preSelectedId) {
        navigate(`/field-intel/dossier/${preSelectedId}`);
      } else {
        navigate('/field-intel/call-log');
      }
    } catch (err) {
      console.error('[CallLogEntry] Submit error:', err);
      alert('Failed to save call log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const backPath = preSelectedId
    ? `/field-intel/dossier/${preSelectedId}`
    : '/field-intel/call-log';

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(backPath)} style={styles.backBtn}>
        <BackIcon /> Back
      </button>

      <h2 style={styles.pageTitle}>Log Call</h2>

      {/* Surgeon Selector */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Surgeon *</label>
        {preSelectedId && selectedName ? (
          <div style={styles.preSelected}>
            <span style={styles.preSelectedName}>{selectedName}</span>
          </div>
        ) : (
          <div style={styles.dropdownWrap}>
            <input
              type="text"
              placeholder={loadingSurgeons ? 'Loading surgeons...' : 'Search surgeon...'}
              value={surgeonId ? selectedName : surgeonSearch}
              onChange={(e) => {
                setSurgeonSearch(e.target.value);
                setSurgeonId('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              style={styles.input}
              disabled={loadingSurgeons}
            />
            {showDropdown && filteredSurgeons.length > 0 && (
              <div style={styles.dropdown}>
                {filteredSurgeons.slice(0, 50).map(s => {
                  const name = s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSurgeonSelect(s)}
                      style={styles.dropdownItem}
                    >
                      <span style={styles.dropdownName}>{name}</span>
                      {s.specialty && <span style={styles.dropdownMeta}>{s.specialty}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Call Date</label>
        <input
          type="date"
          value={callDate}
          onChange={(e) => setCallDate(e.target.value)}
          style={styles.input}
        />
      </div>

      {/* Summary */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Summary *</label>
        <textarea
          placeholder="What happened on this call?"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          style={styles.textarea}
        />
      </div>

      {/* Divider */}
      <div style={styles.divider}>
        <span style={styles.dividerText}>Field Updates (optional)</span>
      </div>

      {/* Buying Stage */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Buying Stage</label>
        <select
          value={buyingStage}
          onChange={(e) => setBuyingStage(e.target.value)}
          style={styles.select}
        >
          <option value="">-- No change --</option>
          <option value="Discovery">Discovery</option>
          <option value="Clinical Buy-in">Clinical Buy-in</option>
          <option value="Trial">Trial</option>
          <option value="Value Analysis (VAC)">Value Analysis (VAC)</option>
          <option value="Closed - Won">Closed - Won</option>
          <option value="Closed - Lost">Closed - Lost</option>
        </select>
      </div>

      {/* Contract Status */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Contract Status</label>
        <select
          value={contractStatus}
          onChange={(e) => setContractStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">-- No change --</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Expired">Expired</option>
          <option value="None">None</option>
        </select>
      </div>

      {/* Forecast Close Date */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Forecast Close Date</label>
        <input
          type="date"
          value={forecastDate}
          onChange={(e) => setForecastDate(e.target.value)}
          style={styles.input}
        />
      </div>

      {/* Competitor Products */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Competitor Products</label>
        <input
          type="text"
          placeholder="e.g. Acme Plate System, Smith & Nephew..."
          value={competitor}
          onChange={(e) => setCompetitor(e.target.value)}
          style={styles.input}
        />
      </div>

      {/* Follow-up Date */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Follow-up Date</label>
        <div style={styles.quickDateRow}>
          {[
            { label: '1 mo', months: 1 },
            { label: '3 mo', months: 3 },
            { label: '6 mo', months: 6 },
          ].map(({ label, months }) => {
            const d = new Date();
            d.setMonth(d.getMonth() + months);
            const val = d.toISOString().split('T')[0];
            return (
              <button
                key={months}
                type="button"
                onClick={() => setFollowUpDate(val)}
                style={{
                  ...styles.quickDateBtn,
                  ...(followUpDate === val ? styles.quickDateBtnActive : {}),
                }}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setFollowUpDate('')}
            style={{
              ...styles.quickDateBtn,
              ...(followUpDate === '' ? {} : {}),
              color: '#94a3b8',
              fontSize: '11px',
            }}
          >
            Clear
          </button>
        </div>
        <input
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          style={styles.input}
        />
      </div>

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <>
          <div style={styles.divider}>
            <span style={styles.dividerText}>Custom Fields</span>
          </div>
          {customFields.map(field => {
            const val = customValues[field.id] || '';
            const onChange = (v) => setCustomValues(prev => ({ ...prev, [field.id]: v }));

            if (field.field_type === 'dropdown') {
              return (
                <div key={field.id} style={styles.fieldGroup}>
                  <label style={styles.label}>{field.field_name}</label>
                  <select value={val} onChange={(e) => onChange(e.target.value)} style={styles.select}>
                    <option value="">-- Select --</option>
                    {(field.dropdown_options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              );
            }
            if (field.field_type === 'date') {
              return (
                <div key={field.id} style={styles.fieldGroup}>
                  <label style={styles.label}>{field.field_name}</label>
                  <input type="date" value={val} onChange={(e) => onChange(e.target.value)} style={styles.input} />
                </div>
              );
            }
            if (field.field_type === 'currency') {
              return (
                <div key={field.id} style={styles.fieldGroup}>
                  <label style={styles.label}>{field.field_name}</label>
                  <input type="number" placeholder="0.00" value={val} onChange={(e) => onChange(e.target.value)} style={styles.input} step="0.01" />
                </div>
              );
            }
            return (
              <div key={field.id} style={styles.fieldGroup}>
                <label style={styles.label}>{field.field_name}</label>
                <input type="text" value={val} onChange={(e) => onChange(e.target.value)} style={styles.input} />
              </div>
            );
          })}
        </>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving || !surgeonId || !summary.trim()}
        style={{
          ...styles.submitBtn,
          ...((saving || !surgeonId || !summary.trim()) ? styles.btnDisabled : {}),
        }}
      >
        {saving ? 'Saving...' : 'Log Call'}
      </button>
    </div>
  );
};

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingBottom: '32px',
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
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    backgroundColor: '#ffffff',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    backgroundColor: '#ffffff',
    appearance: 'auto',
  },
  preSelected: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #93c5fd',
    backgroundColor: '#eff6ff',
  },
  preSelectedName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e3a8a',
  },
  dropdownWrap: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 50,
    marginTop: '2px',
  },
  dropdownItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    padding: '10px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    borderBottom: '1px solid #f1f5f9',
  },
  dropdownName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  dropdownMeta: {
    fontSize: '12px',
    color: '#64748b',
  },
  divider: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '10px',
    marginTop: '4px',
  },
  dividerText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
  },
  submitBtn: {
    padding: '14px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px',
  },
  btnDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'default',
  },
  quickDateRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '6px',
  },
  quickDateBtn: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  quickDateBtnActive: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: '1px solid #1e3a8a',
  },
};

export default CallLogEntry;
