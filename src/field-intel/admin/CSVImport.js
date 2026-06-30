import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase, supabaseUrl } from '../../config/supabase';
import CSVPreview from './CSVPreview';
import CSVColumnMapper from './CSVColumnMapper';

const BATCH_SIZE = 500;

const BUILT_IN_KEYS = new Set([
  'full_name', 'first_name', 'last_name', 'npi', 'site_of_care', 'hospital',
  'specialty', 'address', 'city', 'state', 'zip', 'phone', 'email', 'fax',
  'cpt_code', 'cpt_description', 'annual_volume',
]);

// Fields that route to surgeon_cpt_data instead of surgeons table
const CPT_KEYS = new Set(['cpt_code', 'cpt_description', 'annual_volume']);

// Fields that trigger AI summary regeneration when changed via import
const AI_TRIGGER_FIELDS = new Set([
  'specialty', 'hospital', 'site_of_care',
  'cpt_code', 'cpt_description', 'annual_volume',
]);

const CSVImport = () => {
  const fileRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const importMode = 'update'; // always upsert
  const [results, setResults] = useState({ success: 0, errors: 0, errorMessages: [] });
  const [customFields, setCustomFields] = useState([]);
  const [cptCode, setCptCode] = useState('');
  const [cptDescription, setCptDescription] = useState('');
  const [averagePrice, setAveragePrice] = useState('');

  // Load saved custom fields on mount
  useEffect(() => {
    const fetchCustomFields = async () => {
      const { data } = await supabase
        .from('custom_fields')
        .select('id, field_name')
        .eq('is_active', true)
        .order('sort_order');
      if (data) setCustomFields(data);
    };
    fetchCustomFields();
  }, []);

  const handleCreateCustomField = async (fieldName) => {
    // Check if it already exists
    const existing = customFields.find(
      (cf) => cf.field_name.toLowerCase() === fieldName.toLowerCase()
    );
    if (existing) return existing;

    const { data, error } = await supabase
      .from('custom_fields')
      .insert({ field_name: fieldName, field_type: 'text' })
      .select('id, field_name')
      .single();

    if (error) {
      console.error('[CSVImport] Error creating custom field:', error);
      alert('Failed to create custom field: ' + error.message);
      return null;
    }

    setCustomFields((prev) => [...prev, data]);
    return data;
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

        if (!json.length) {
          alert('No data found in file.');
          return;
        }

        const cols = Object.keys(json[0]);
        setColumns(cols);
        setRows(json);

        // Auto-map columns
        const autoMapping = {};
        cols.forEach((col) => {
          const normalized = col.toLowerCase().replace(/[\s_-]+/g, '_').trim();
          const fieldMap = {
            full_name: 'full_name',
            name: 'full_name',
            hcp: 'full_name',
            hcp_name: 'full_name',
            physician: 'full_name',
            physician_name: 'full_name',
            provider: 'full_name',
            provider_name: 'full_name',
            doctor: 'full_name',
            doctor_name: 'full_name',
            surgeon: 'full_name',
            surgeon_name: 'full_name',
            first_name: 'first_name',
            first: 'first_name',
            fname: 'first_name',
            last_name: 'last_name',
            last: 'last_name',
            lname: 'last_name',
            npi: 'npi',
            npi_number: 'npi',
            national_provider_identifier: 'npi',
            site_of_care: 'site_of_care',
            site: 'site_of_care',
            primary_site_of_care: 'site_of_care',
            primary_site: 'site_of_care',
            practice: 'site_of_care',
            practice_name: 'site_of_care',
            hospital: 'hospital',
            facility: 'hospital',
            facility_name: 'hospital',
            hospital_name: 'hospital',
            institution: 'hospital',
            specialty: 'specialty',
            address: 'address',
            street: 'address',
            street_address: 'address',
            address_line_1: 'address',
            address_1: 'address',
            address1: 'address',
            addr: 'address',
            city: 'city',
            state: 'state',
            st: 'state',
            zip: 'zip',
            zip_code: 'zip',
            zipcode: 'zip',
            postal_code: 'zip',
            postal: 'zip',
            phone: 'phone',
            phone_number: 'phone',
            telephone: 'phone',
            tel: 'phone',
            email: 'email',
            email_address: 'email',
            fax: 'fax',
            fax_number: 'fax',
            annual_volume: 'annual_volume',
            volume: 'annual_volume',
            total_volume: 'annual_volume',
            procedure_volume: 'annual_volume',
            cpt_volume: 'annual_volume',
            cases: 'annual_volume',
          };

          // Check built-in aliases first
          if (fieldMap[normalized]) {
            autoMapping[col] = fieldMap[normalized];
            return;
          }

          // Check saved custom fields
          const matchedCustom = customFields.find(
            (cf) => cf.field_name.toLowerCase().replace(/[\s_-]+/g, '_') === normalized
          );
          if (matchedCustom) {
            autoMapping[col] = `custom:${matchedCustom.id}`;
            return;
          }

          autoMapping[col] = 'skip';
        });
        setMapping(autoMapping);
        setStatus('parsed');
      } catch (err) {
        console.error('[CSVImport] Parse error:', err);
        alert('Failed to parse file. Make sure it is a valid .csv or .xlsx file.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const hasNpi = Object.values(mapping).includes('npi');
    if (!hasNpi) {
      alert('NPI column must be mapped. NPI is required to match and merge records across imports.');
      return;
    }
    if (!cptCode.trim()) {
      alert('CPT Code is required. Enter the procedure code for this surgery type (e.g. 27447).');
      return;
    }

    // Separate built-in surgeon fields, CPT fields, and custom mappings
    const surgeonMap = {};
    const cptMap = {};
    const customMap = {}; // { csvCol: customFieldId }
    Object.entries(mapping).forEach(([csvCol, field]) => {
      if (field === 'skip') return;
      if (field.startsWith('custom:')) {
        customMap[csvCol] = field.replace('custom:', '');
      } else if (CPT_KEYS.has(field)) {
        cptMap[csvCol] = field;
      } else {
        surgeonMap[csvCol] = field;
      }
    });

    const hasSurgeon = Object.keys(surgeonMap).length > 0;
    const hasCpt = Object.keys(cptMap).length > 0;
    const hasCustom = Object.keys(customMap).length > 0;

    if (!hasSurgeon && !hasCpt && !hasCustom) {
      alert('No columns mapped. Map at least one column before importing.');
      return;
    }

    setStatus('importing');
    let success = 0;
    let errors = 0;
    const errorMessages = [];

    // Pre-fetch existing NPIs so we only set the contract_status default on new surgeons.
    // Re-imports must NOT overwrite contract_status that reps have updated in-app.
    const npiCol = Object.entries(mapping).find(([, v]) => v === 'npi')?.[0];
    const allNpis = npiCol ? [...new Set(rows.map((r) => r[npiCol]).filter(Boolean).map(String))] : [];
    const existingNpiSet = new Set();
    for (let i = 0; i < allNpis.length; i += BATCH_SIZE) {
      const batch = allNpis.slice(i, i + BATCH_SIZE);
      const { data: existing } = await supabase
        .from('surgeons')
        .select('npi')
        .in('npi', batch);
      (existing || []).forEach((s) => { if (s.npi) existingNpiSet.add(String(s.npi)); });
    }

    // Build surgeon rows (non-CPT built-in fields only)
    const surgeonRows = hasSurgeon ? rows.map((row) => {
      const obj = {};
      Object.entries(surgeonMap).forEach(([csvCol, field]) => {
        let val = row[csvCol];
        if (field === 'zip') val = String(val || '');
        obj[field] = val;
      });
      // Only seed contract_status='unknown' for brand-new surgeons.
      // Existing surgeons retain whatever reps have set in the app.
      if (obj.npi && !existingNpiSet.has(String(obj.npi))) {
        obj.contract_status = 'unknown';
      }
      return obj;
    }) : [];

    // Upsert surgeon built-in fields in batches
    for (let i = 0; i < surgeonRows.length; i += BATCH_SIZE) {
      const batch = surgeonRows.slice(i, i + BATCH_SIZE);
      try {
        const options = { onConflict: 'npi' };

        const { error } = await supabase
          .from('surgeons')
          .upsert(batch, options);

        if (error) {
          errors += batch.length;
          errorMessages.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        } else {
          success += batch.length;
        }
      } catch (err) {
        errors += batch.length;
        errorMessages.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
      }
    }

    // Look up surgeon IDs by NPI (needed for CPT data and custom fields)
    const npiToId = {};
    if (hasNpi && npiCol) {
      for (let i = 0; i < allNpis.length; i += BATCH_SIZE) {
        const batch = allNpis.slice(i, i + BATCH_SIZE);
        const { data } = await supabase
          .from('surgeons')
          .select('id, npi')
          .in('npi', batch);
        if (data) {
          data.forEach((s) => { npiToId[s.npi] = s.id; });
        }
      }
    }

    // Handle CPT data -> surgeon_cpt_data table
    // CPT code comes from the manual input, not the CSV
    if (hasNpi && npiCol) {
      const volumeCol = Object.entries(mapping).find(([, v]) => v === 'annual_volume')?.[0];
      const siteCol = Object.entries(mapping).find(([, v]) => v === 'site_of_care')?.[0];
      const descCol = Object.entries(mapping).find(([, v]) => v === 'cpt_description')?.[0];

      const cptRows = [];
      rows.forEach((row) => {
        const npi = row[npiCol];
        const surgeonId = npiToId[npi];
        if (!surgeonId) return;

        const cptObj = {
          surgeon_id: surgeonId,
          cpt_code: cptCode.trim(),
          cpt_description: cptDescription.trim() || (descCol ? row[descCol] : null),
          annual_volume: volumeCol ? (parseInt(row[volumeCol], 10) || null) : null,
        };

        if (siteCol && row[siteCol]) {
          cptObj.site_of_care = row[siteCol];
        }

        cptRows.push(cptObj);
      });

      // Upsert CPT data in batches
      for (let i = 0; i < cptRows.length; i += BATCH_SIZE) {
        const batch = cptRows.slice(i, i + BATCH_SIZE);
        try {
          const { error } = await supabase
            .from('surgeon_cpt_data')
            .upsert(batch, { onConflict: 'surgeon_id,cpt_code' });

          if (error) {
            errorMessages.push(`CPT data batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
          }
        } catch (err) {
          errorMessages.push(`CPT data batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
        }
      }

      // Upsert into cpt_prices if averagePrice was entered
      if (averagePrice && parseFloat(averagePrice) > 0) {
        try {
          const { error } = await supabase
            .from('cpt_prices')
            .upsert({
              cpt_code: cptCode.trim(),
              cpt_description: cptDescription.trim() || null,
              average_price: parseFloat(averagePrice),
            }, { onConflict: 'cpt_code' });

          if (error) {
            errorMessages.push(`CPT price: ${error.message}`);
          }
        } catch (err) {
          errorMessages.push(`CPT price: ${err.message}`);
        }
      }
    }

    // Handle custom field values
    if (hasCustom && hasNpi && npiCol) {
      const cfvRows = [];
      rows.forEach((row) => {
        const npi = row[npiCol];
        const surgeonId = npiToId[npi];
        if (!surgeonId) return;

        Object.entries(customMap).forEach(([csvCol, fieldId]) => {
          const val = row[csvCol];
          if (val != null && String(val).trim() !== '') {
            cfvRows.push({
              surgeon_id: surgeonId,
              field_id: fieldId,
              value: String(val),
            });
          }
        });
      });

      // Insert only NEW custom field values; retain anything reps have already set.
      // Pre-fetch existing (surgeon_id, field_id) pairs so we know what to skip.
      const existingPairs = new Set();
      const surgeonIdsForCfv = [...new Set(cfvRows.map((r) => r.surgeon_id))];
      const fieldIdsForCfv = [...new Set(cfvRows.map((r) => r.field_id))];
      if (surgeonIdsForCfv.length && fieldIdsForCfv.length) {
        for (let i = 0; i < surgeonIdsForCfv.length; i += BATCH_SIZE) {
          const batch = surgeonIdsForCfv.slice(i, i + BATCH_SIZE);
          const { data: existing } = await supabase
            .from('custom_field_values')
            .select('surgeon_id, field_id')
            .in('surgeon_id', batch)
            .in('field_id', fieldIdsForCfv);
          (existing || []).forEach((r) => existingPairs.add(`${r.surgeon_id}|${r.field_id}`));
        }
      }
      const newCfvRows = cfvRows.filter((r) => !existingPairs.has(`${r.surgeon_id}|${r.field_id}`));

      for (let i = 0; i < newCfvRows.length; i += BATCH_SIZE) {
        const batch = newCfvRows.slice(i, i + BATCH_SIZE);
        try {
          const { error } = await supabase
            .from('custom_field_values')
            .insert(batch);

          if (error) {
            errorMessages.push(`Custom fields batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
          }
        } catch (err) {
          errorMessages.push(`Custom fields batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
        }
      }
    }

    // Trigger AI summary regeneration for surgeons whose practice/procedure data changed
    const mappedFields = new Set(Object.values(mapping));
    const hasTriggerField = [...AI_TRIGGER_FIELDS].some(f => mappedFields.has(f));

    if (hasTriggerField && hasNpi && npiCol && Object.keys(npiToId).length > 0) {
      console.log('[CSVImport] Practice/procedure data changed, triggering AI regeneration...');
      const surgeonIds = [...new Set(Object.values(npiToId))];

      // Fire regenerations in background (don't block the import result)
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          const baseUrl = supabaseUrl;

          for (const sid of surgeonIds) {
            try {
              const { data: surgeon } = await supabase
                .from('surgeons')
                .select('full_name, first_name, last_name')
                .eq('id', sid)
                .single();

              if (!surgeon) continue;
              const name = surgeon.full_name || `${surgeon.first_name || ''} ${surgeon.last_name || ''}`.trim();
              if (!name) continue;

              await fetch(`${baseUrl}/functions/v1/physician-research`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ surgeonId: sid, physicianName: name }),
              });
              console.log('[CSVImport] AI regen triggered for', name);
            } catch (err) {
              console.warn('[CSVImport] AI regen failed for surgeon', sid, err);
            }
          }
        } catch (err) {
          console.warn('[CSVImport] AI regen session error:', err);
        }
      })();
    }

    setResults({ success, errors, errorMessages });
    setStatus('done');
  };

  const handleReset = () => {
    setStatus('idle');
    setFileName('');
    setColumns([]);
    setRows([]);
    setMapping({});
    setCptCode('');
    setCptDescription('');
    setAveragePrice('');
    setResults({ success: 0, errors: 0, errorMessages: [] });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div style={styles.container}>
      <div style={styles.titleRow}>
        <h2 style={styles.title}>Database Import</h2>
        {status !== 'idle' && status !== 'importing' && (
          <button onClick={handleReset} style={styles.resetBtn}>
            Start Over
          </button>
        )}
      </div>

      {/* File Picker */}
      {status === 'idle' && (
        <label style={styles.dropZone}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span style={styles.dropLabel}>Click to upload CSV or Excel file</span>
          <span style={styles.dropHint}>Supports .csv, .xlsx, .xls</span>
        </label>
      )}

      {/* File name badge */}
      {fileName && status !== 'idle' && (
        <div style={styles.fileBadge}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span style={styles.fileNameText}>{fileName}</span>
        </div>
      )}

      {/* Preview */}
      {(status === 'parsed' || status === 'importing') && (
        <CSVPreview columns={columns} rows={rows} />
      )}

      {/* Column Mapper */}
      {status === 'parsed' && (
        <>
          <div style={{ marginTop: '16px' }}>
            <CSVColumnMapper
              columns={columns}
              rows={rows}
              mapping={mapping}
              onMappingChange={setMapping}
              customFields={customFields}
              onCustomFieldCreated={handleCreateCustomField}
            />
          </div>

          {/* Procedure Type -- required before import */}
          <div style={styles.procedureCard}>
            <h3 style={styles.procedureSectionTitle}>Procedure Type</h3>
            <span style={styles.procedureSectionHint}>
              Each file represents one surgery type. Enter the CPT code for this procedure -- it applies to all rows.
            </span>

            <div style={styles.procedureFieldRow}>
              <label style={styles.procedureFieldLabel}>CPT Code *</label>
              <input
                type="text"
                placeholder="e.g. 27447"
                value={cptCode}
                onChange={(e) => setCptCode(e.target.value)}
                style={styles.procedureInput}
              />
            </div>

            <div style={styles.procedureFieldRow}>
              <label style={styles.procedureFieldLabel}>Description</label>
              <input
                type="text"
                placeholder="e.g. Total Knee Arthroplasty"
                value={cptDescription}
                onChange={(e) => setCptDescription(e.target.value)}
                style={styles.procedureInput}
              />
            </div>

            <div style={styles.procedureFieldRow}>
              <label style={styles.procedureFieldLabel}>Average Price Per Procedure</label>
              <div style={styles.priceInputWrap}>
                <span style={styles.priceCurrency}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={averagePrice}
                  onChange={(e) => setAveragePrice(e.target.value)}
                  style={styles.priceInput}
                />
              </div>
              <span style={styles.priceHint}>
                Optional -- enables market potential calculations
              </span>
            </div>
          </div>

          {/* Import Button */}
          <button onClick={handleImport} style={styles.importBtn}>
            Import {rows.length} Row{rows.length !== 1 ? 's' : ''}
          </button>
          <p style={styles.importHint}>
            New surgeons are added automatically. Existing surgeons (matched by NPI) are updated with the latest data.
          </p>
        </>
      )}

      {/* Importing State */}
      {status === 'importing' && (
        <div style={styles.statusCard}>
          <div style={styles.spinner} />
          <span style={styles.statusText}>Importing records...</span>
        </div>
      )}

      {/* Results */}
      {status === 'done' && (
        <div style={styles.resultsCard}>
          <h3 style={styles.resultsTitle}>Import Complete</h3>
          <div style={styles.resultsGrid}>
            <div style={styles.resultItem}>
              <span style={styles.resultCount}>{results.success}</span>
              <span style={styles.resultLabel}>Successful</span>
            </div>
            <div style={styles.resultItem}>
              <span style={{ ...styles.resultCount, color: results.errors > 0 ? '#dc2626' : '#16a34a' }}>
                {results.errors}
              </span>
              <span style={styles.resultLabel}>Errors</span>
            </div>
          </div>
          {results.errorMessages.length > 0 && (
            <div style={styles.errorList}>
              {results.errorMessages.map((msg, i) => (
                <p key={i} style={styles.errorMsg}>{msg}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  resetBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '48px 24px',
    border: '2px dashed #cbd5e1',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
  },
  dropLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  dropHint: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  fileBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    alignSelf: 'flex-start',
  },
  fileNameText: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1e3a8a',
  },
  importHint: {
    fontSize: '13px',
    color: '#64748b',
    textAlign: 'center',
    margin: '8px 0 0 0',
    lineHeight: '1.4',
  },
  procedureCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  procedureSectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  procedureSectionHint: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.4',
    marginTop: '-8px',
  },
  procedureFieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  procedureFieldLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  procedureInput: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    outline: 'none',
  },
  priceInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
  },
  priceCurrency: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#64748b',
  },
  priceInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    color: '#1e293b',
    backgroundColor: 'transparent',
  },
  priceHint: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '6px',
    display: 'block',
  },
  importBtn: {
    padding: '14px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    textAlign: 'center',
    width: '100%',
  },
  statusCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    marginTop: '16px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #e2e8f0',
    borderTop: '2px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  statusText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#64748b',
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    textAlign: 'center',
  },
  resultsTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  resultsGrid: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
  },
  resultItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  resultCount: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#16a34a',
  },
  resultLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  errorList: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    textAlign: 'left',
  },
  errorMsg: {
    fontSize: '13px',
    color: '#dc2626',
    margin: '0 0 4px 0',
  },
};

export default CSVImport;
