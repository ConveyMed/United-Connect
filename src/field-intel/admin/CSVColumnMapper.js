import React, { useState } from 'react';

const BUILT_IN_FIELDS = [
  { value: 'skip', label: '-- Skip --' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'npi', label: 'NPI' },
  { value: 'site_of_care', label: 'Site of Care' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'specialty', label: 'Specialty' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zip', label: 'ZIP' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'fax', label: 'Fax' },
  { value: 'annual_volume', label: 'Total Procedures' },
];

const CSVColumnMapper = ({ columns, rows, mapping, onMappingChange, customFields, onCustomFieldCreated }) => {
  const [customInputCol, setCustomInputCol] = useState(null);

  const getSampleValue = (colName) => {
    for (const row of rows) {
      const val = row[colName];
      if (val != null && String(val).trim() !== '') {
        return String(val);
      }
    }
    return '';
  };

  const buildOptions = () => {
    const options = [...BUILT_IN_FIELDS];
    if (customFields.length > 0) {
      options.push({ value: '__divider__', label: '--- Custom Fields ---', disabled: true });
      customFields.forEach((cf) => {
        options.push({ value: `custom:${cf.id}`, label: cf.field_name });
      });
    }
    options.push({ value: '__custom__', label: '+ Add Custom Field...' });
    return options;
  };

  const handleChange = (csvCol, val) => {
    if (val === '__custom__') {
      setCustomInputCol(csvCol);
      return;
    }
    onMappingChange({ ...mapping, [csvCol]: val });
  };

  const handleCustomSubmit = async (csvCol, fieldName) => {
    if (!fieldName.trim()) return;
    const created = await onCustomFieldCreated(fieldName.trim());
    if (created) {
      onMappingChange({ ...mapping, [csvCol]: `custom:${created.id}` });
    }
    setCustomInputCol(null);
  };

  const mappedCount = Object.values(mapping).filter(v => v !== 'skip').length;
  const allOptions = buildOptions();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
        <span style={styles.headerText}>
          Column Mapping ({mappedCount} of {columns.length} mapped)
        </span>
      </div>
      <div style={styles.list}>
        {columns.map((col) => {
          const sample = getSampleValue(col);
          const currentVal = mapping[col] || 'skip';
          const showCustomInput = customInputCol === col;

          return (
            <div key={col} style={styles.row}>
              <div style={styles.colInfo}>
                <span style={styles.colName}>{col}</span>
                {sample && (
                  <span style={styles.sample}>e.g. "{sample.length > 40 ? sample.slice(0, 40) + '...' : sample}"</span>
                )}
              </div>
              <div style={styles.mappingControl}>
                {showCustomInput ? (
                  <CustomFieldInput
                    onSubmit={(val) => handleCustomSubmit(col, val)}
                    onCancel={() => setCustomInputCol(null)}
                  />
                ) : (
                  <select
                    value={currentVal}
                    onChange={(e) => handleChange(col, e.target.value)}
                    style={styles.select}
                  >
                    {allOptions.map((f) => (
                      <option
                        key={f.value}
                        value={f.value}
                        disabled={f.disabled}
                        style={f.disabled ? { fontWeight: '700', color: '#94a3b8' } : {}}
                      >
                        {f.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CustomFieldInput = ({ onSubmit, onCancel }) => {
  const [value, setValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div style={styles.customInput}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Field name..."
        autoFocus
        style={styles.textInput}
      />
      <button onClick={() => onSubmit(value)} style={styles.saveBtn}>Save</button>
      <button onClick={onCancel} style={styles.cancelBtn}>Cancel</button>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  headerText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  list: {
    padding: '8px 0',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    gap: '12px',
    borderBottom: '1px solid #f1f5f9',
  },
  colInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  colName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sample: {
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mappingControl: {
    flexShrink: 0,
  },
  select: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    color: '#334155',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    minWidth: '150px',
    outline: 'none',
  },
  customInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  textInput: {
    padding: '7px 10px',
    borderRadius: '8px',
    border: '1px solid #1e3a8a',
    fontSize: '13px',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    outline: 'none',
    width: '120px',
  },
  saveBtn: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default CSVColumnMapper;
