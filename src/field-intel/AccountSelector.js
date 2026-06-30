import React, { useState, useMemo } from 'react';

const DISPLAY_CHUNK = 100;

const AccountSelector = ({
  accounts = [],
  selectedIds = [],
  onSelectionChange,
  searchQuery = '',
  onSearchChange,
  showAssignedTo = false,
  delegationMap = {},
}) => {
  const [displayCount, setDisplayCount] = useState(DISPLAY_CHUNK);

  // Reset display count when accounts change
  const accountKey = accounts.length;
  const [prevKey, setPrevKey] = useState(accountKey);
  if (accountKey !== prevKey) {
    setPrevKey(accountKey);
    setDisplayCount(DISPLAY_CHUNK);
  }

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = accounts.length > 0 && accounts.every(a => selectedSet.has(a.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(accounts.map(a => a.id));
    }
  };

  const toggleOne = (id) => {
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const visible = useMemo(() => accounts.slice(0, displayCount), [accounts, displayCount]);
  const hasMore = accounts.length > displayCount;
  const remaining = accounts.length - displayCount;

  return (
    <div style={styles.wrapper}>
      <div style={styles.searchRow}>
        <div style={styles.searchInputWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, NPI, specialty..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} style={styles.clearBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div style={styles.controlRow}>
        <button onClick={toggleAll} style={styles.selectAllBtn}>
          <div style={{
            ...styles.checkbox,
            ...(allSelected ? styles.checkboxChecked : {}),
            ...(someSelected ? styles.checkboxPartial : {}),
          }}>
            {allSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {someSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </div>
          <span style={styles.selectAllText}>
            {allSelected ? 'Deselect All' : `Select All ${accounts.length.toLocaleString()}`}
          </span>
        </button>
        <span style={styles.countLabel}>
          {selectedIds.length > 0
            ? `${selectedIds.length.toLocaleString()} selected`
            : `${accounts.length.toLocaleString()} account${accounts.length !== 1 ? 's' : ''}`
          }
        </span>
      </div>

      <div style={styles.list}>
        {accounts.length === 0 && (
          <div style={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span style={styles.emptyText}>No accounts found</span>
          </div>
        )}
        {visible.map((acct) => {
          const checked = selectedSet.has(acct.id);
          const assignedTo = showAssignedTo ? delegationMap[acct.id] : null;
          return (
            <button
              key={acct.id}
              onClick={() => toggleOne(acct.id)}
              style={{
                ...styles.row,
                ...(checked ? styles.rowChecked : {}),
              }}
            >
              <div style={{
                ...styles.checkbox,
                ...(checked ? styles.checkboxChecked : {}),
              }}>
                {checked && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div style={styles.rowInfo}>
                <span style={styles.rowName}>{acct.full_name || `${acct.first_name || ''} ${acct.last_name || ''}`.trim() || 'Unknown'}</span>
                <div style={styles.rowMeta}>
                  {acct.specialty && <span style={styles.metaTag}>{acct.specialty}</span>}
                  {(acct.city || acct.state) && (
                    <span style={styles.metaText}>{[acct.city, acct.state].filter(Boolean).join(', ')}</span>
                  )}
                  {acct.npi && <span style={styles.metaText}>NPI: {acct.npi}</span>}
                </div>
                {acct.procedures && acct.procedures.length > 0 && (
                  <div style={styles.cptBreakdown}>
                    {acct.procedures.map((p, i) => {
                      const lineTotal = (p.volume || 0) * (p.price || 0);
                      return (
                        <div key={i} style={styles.procedureRow}>
                          <span style={styles.cptLabel}>CPT {p.cpt_code}</span>
                          <span style={styles.volumeTag}>{(p.volume || 0).toLocaleString()} cases</span>
                          {p.price > 0 && (
                            <span style={styles.priceTag}>
                              @ {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.price)}
                            </span>
                          )}
                          {lineTotal > 0 && (
                            <span style={styles.lineTotalTag}>
                              = {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(lineTotal)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {acct.marketPotential > 0 && (
                      <div style={styles.totalRow}>
                        <span style={styles.totalLabel}>Total</span>
                        <span style={styles.volumeTag}>{(acct.totalVolume || 0).toLocaleString()} cases</span>
                        <span style={styles.potentialTag}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(acct.marketPotential)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {assignedTo && (
                  <span style={styles.assignedLabel}>Assigned to: {assignedTo}</span>
                )}
              </div>
            </button>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setDisplayCount(prev => prev + DISPLAY_CHUNK)}
            style={styles.loadMoreBtn}
          >
            Show {Math.min(remaining, DISPLAY_CHUNK).toLocaleString()} more
            <span style={styles.loadMoreHint}>
              ({remaining.toLocaleString()} remaining)
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  searchRow: {
    padding: '0 0 12px 0',
  },
  searchInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#1e293b',
    backgroundColor: 'transparent',
  },
  clearBtn: {
    padding: '2px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 0 8px 0',
  },
  selectAllBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  selectAllText: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1e3a8a',
  },
  countLabel: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    borderRadius: '5px',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  checkboxChecked: {
    backgroundColor: '#1e3a8a',
    border: '2px solid #1e3a8a',
  },
  checkboxPartial: {
    backgroundColor: '#93c5fd',
    border: '2px solid #93c5fd',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '32px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s ease',
  },
  rowChecked: {
    backgroundColor: '#eff6ff',
    border: '1px solid #93c5fd',
  },
  rowInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  rowName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  rowMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  metaTag: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  metaText: {
    fontSize: '12px',
    color: '#64748b',
  },
  cptBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '4px',
  },
  procedureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  cptLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    minWidth: '58px',
  },
  lineTotalTag: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#059669',
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '4px',
    marginTop: '2px',
  },
  totalLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#1e293b',
    minWidth: '58px',
  },
  volumeTag: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  priceTag: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#7c3aed',
    backgroundColor: '#f5f3ff',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  potentialTag: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  assignedLabel: {
    fontSize: '12px',
    color: '#059669',
    fontWeight: '500',
    marginTop: '2px',
  },
  loadMoreBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '14px',
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e3a8a',
  },
  loadMoreHint: {
    fontSize: '12px',
    fontWeight: '400',
    color: '#94a3b8',
  },
};

export default AccountSelector;
