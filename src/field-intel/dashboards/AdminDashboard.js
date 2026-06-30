import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import DashboardMetrics from './DashboardMetrics';
import AccountCard from '../AccountCard';
import { exportSurgeonsCSV } from '../utils/exportSurgeons';
import ExportProgressModal from '../utils/ExportProgressModal';

const DatabaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Menu square icons (24x24)
const OrgChartMenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="5" rx="1" />
    <rect x="2" y="17" width="6" height="5" rx="1" />
    <rect x="16" y="17" width="6" height="5" rx="1" />
    <line x1="12" y1="7" x2="12" y2="12" />
    <line x1="5" y1="17" x2="5" y2="12" />
    <line x1="19" y1="17" x2="19" y2="12" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const RegionsMenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ImportMenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ExportMenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const AssignMenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const LeadMenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const ResetMenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const CustomFieldsMenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const menuItems = [
  { key: 'hierarchy', label: 'Org Charts', Icon: OrgChartMenuIcon, path: '/field-intel/settings/hierarchy' },
  { key: 'regions', label: 'Region Management', Icon: RegionsMenuIcon, path: '/field-intel/manage-regions' },
  { key: 'import', label: 'Import Data', Icon: ImportMenuIcon, path: '/field-intel/database' },
  { key: 'export', label: 'Export Data', Icon: ExportMenuIcon },
  { key: 'assign', label: 'Assign Accounts', Icon: AssignMenuIcon, path: '/field-intel/settings/assign-accounts' },
  { key: 'leads', label: 'Lead Queue', Icon: LeadMenuIcon, path: '/field-intel/leads' },
  { key: 'custom-fields', label: 'Custom Fields', Icon: CustomFieldsMenuIcon, path: '/field-intel/settings/custom-fields' },
  { key: 'reset', label: 'Reset Data', Icon: ResetMenuIcon, danger: true },
];

const BUYING_STAGES = [
  { key: 'Discovery', color: '#6366f1', bg: '#eef2ff' },
  { key: 'Clinical Buy-in', color: '#0891b2', bg: '#ecfeff' },
  { key: 'Trial', color: '#d97706', bg: '#fffbeb' },
  { key: 'Value Analysis (VAC)', color: '#ea580c', bg: '#fff7ed' },
  { key: 'Closed - Won', color: '#059669', bg: '#ecfdf5' },
  { key: 'Closed - Lost', color: '#dc2626', bg: '#fef2f2' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [totalSurgeons, setTotalSurgeons] = useState(0);
  const [pendingLeads, setPendingLeads] = useState(0);
  const [totalRegions, setTotalRegions] = useState(0);
  const [stageCounts, setStageCounts] = useState({});
  const [allSurgeons, setAllSurgeons] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notStagedCount, setNotStagedCount] = useState(0);
  const [latestCallMap, setLatestCallMap] = useState({});
  const [repMap, setRepMap] = useState({});
  const [cptMap, setCptMap] = useState({});
  const [cptPriceMap, setCptPriceMap] = useState({});

  // Reset data
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [resetting, setResetting] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ phase: 'scope', count: 0 });
  const [exportError, setExportError] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [surgeonsRes, leadsRes, regionsRes] = await Promise.all([
        supabase.from('surgeons')
          .select('id, full_name, first_name, last_name, specialty, city, state, npi, buying_stage, forecast_close_date')
          .order('forecast_close_date', { ascending: true, nullsFirst: false }),
        supabase.from('leads').select('id').eq('status', 'pending'),
        supabase.from('regions').select('id'),
      ]);

      const surgeons = surgeonsRes.data || [];
      setAllSurgeons(surgeons);
      setTotalSurgeons(surgeons.length);
      setPendingLeads((leadsRes.data || []).length);
      setTotalRegions((regionsRes.data || []).length);

      // Count by buying stage
      const counts = {};
      let noStage = 0;
      BUYING_STAGES.forEach(s => { counts[s.key] = 0; });
      surgeons.forEach(s => {
        if (s.buying_stage && counts[s.buying_stage] !== undefined) {
          counts[s.buying_stage]++;
        } else {
          noStage++;
        }
      });
      setStageCounts(counts);
      setNotStagedCount(noStage);

      // Enrichment data
      const surgeonIds = surgeons.map(s => s.id);
      if (surgeonIds.length > 0) {
        const [callsRes, delegationsRes, cptDataRes, cptPricesRes] = await Promise.all([
          supabase.from('call_logs')
            .select('surgeon_id, call_date, summary, buying_stage_update, user_id, rep:users!call_logs_user_id_fkey(first_name, last_name)')
            .in('surgeon_id', surgeonIds)
            .order('call_date', { ascending: false }),
          supabase.from('account_delegations')
            .select('surgeon_id, user_id, rep:users!user_id(first_name, last_name)')
            .in('surgeon_id', surgeonIds),
          supabase.from('surgeon_cpt_data')
            .select('surgeon_id, cpt_code, cpt_description, annual_volume')
            .in('surgeon_id', surgeonIds),
          supabase.from('cpt_prices').select('cpt_code, average_price'),
        ]);

        const clMap = {};
        (callsRes.data || []).forEach(c => { if (!clMap[c.surgeon_id]) clMap[c.surgeon_id] = c; });
        setLatestCallMap(clMap);

        const rMap = {};
        (delegationsRes.data || []).forEach(d => { if (!rMap[d.surgeon_id]) rMap[d.surgeon_id] = d.rep; });
        setRepMap(rMap);

        const cMap = {};
        (cptDataRes.data || []).forEach(c => {
          if (!cMap[c.surgeon_id]) cMap[c.surgeon_id] = [];
          cMap[c.surgeon_id].push(c);
        });
        setCptMap(cMap);

        const pMap = {};
        (cptPricesRes.data || []).forEach(p => { if (p.average_price != null) pMap[p.cpt_code] = parseFloat(p.average_price); });
        setCptPriceMap(pMap);
      }
    } catch (err) {
      console.error('[AdminDashboard] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Reset functions
  const resetSurgicalData = async () => {
    setResetting(true);
    try {
      await supabase.from('call_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('physician_profiles').delete().neq('surgeon_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('custom_field_values').delete().neq('surgeon_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('surgeon_regions').delete().neq('surgeon_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('account_delegations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('surgeon_cpt_data').delete().neq('surgeon_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('surgeons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cpt_prices').delete().neq('cpt_code', '');
      alert('Surgical data reset complete.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setResetting(false);
    setConfirmAction(null);
    fetchDashboard();
  };

  const resetRoles = async () => {
    setResetting(true);
    try {
      await supabase.from('account_delegations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('hierarchy_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      alert('Roles and assignments reset complete.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setResetting(false);
    setConfirmAction(null);
    fetchDashboard();
  };

  const resetAll = async () => {
    setResetting(true);
    try {
      await supabase.from('call_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('physician_profiles').delete().neq('surgeon_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('custom_field_values').delete().neq('surgeon_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('account_delegations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('surgeon_regions').delete().neq('surgeon_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('hierarchy_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('surgeon_cpt_data').delete().neq('surgeon_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('surgeons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cpt_prices').delete().neq('cpt_code', '');
      alert('All Field Intel data reset complete.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setResetting(false);
    setConfirmAction(null);
    fetchDashboard();
  };

  const handleReset = (action) => {
    if (confirmAction === action) {
      if (action === 'data') resetSurgicalData();
      else if (action === 'roles') resetRoles();
      else if (action === 'all') resetAll();
    } else {
      setConfirmAction(action);
    }
  };

  const handleMenuClick = async (item) => {
    if (item.key === 'reset') {
      setShowResetPanel(!showResetPanel);
      return;
    }
    if (item.key === 'export') {
      if (exporting) return;
      setExporting(true);
      setExportError(null);
      setExportProgress({ phase: 'scope', count: 0 });
      setExportModalOpen(true);
      try {
        await exportSurgeonsCSV(
          { kind: 'admin' },
          'field-intel-all',
          (p) => setExportProgress(p)
        );
      } catch (err) {
        console.error('[FieldIntel] Export failed:', err);
        setExportError(err?.message || 'Something went wrong while exporting.');
      } finally {
        setExporting(false);
      }
      return;
    }
    if (item.path) navigate(item.path);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Surgeons', value: totalSurgeons, color: '#1e3a8a', icon: <DatabaseIcon /> },
    { label: 'Regions', value: totalRegions, color: '#d97706', icon: <GlobeIcon /> },
  ];

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Admin</h2>

      <DashboardMetrics metrics={metrics} />

      {/* Not Staged - wide button */}
      <button
        onClick={() => setSelectedStage(selectedStage === 'Not Staged' ? null : 'Not Staged')}
        style={{
          ...styles.notStagedBtn,
          backgroundColor: selectedStage === 'Not Staged' ? '#64748b' : '#f8fafc',
          color: selectedStage === 'Not Staged' ? '#ffffff' : '#64748b',
          border: selectedStage === 'Not Staged' ? '1px solid #64748b' : '1px solid #e2e8f0',
        }}
      >
        <span style={{ fontSize: '18px', fontWeight: '700' }}>{notStagedCount}</span>
        <span style={{ fontSize: '12px', fontWeight: '600' }}>Not Staged</span>
      </button>

      {/* Buying Stage Cards */}
      <div style={styles.stageGrid}>
        {BUYING_STAGES.map(stage => {
          const count = stageCounts[stage.key] || 0;
          const isSelected = selectedStage === stage.key;
          return (
            <button key={stage.key} onClick={() => setSelectedStage(isSelected ? null : stage.key)} style={{ ...styles.stageTile, backgroundColor: isSelected ? stage.color : stage.bg, border: `1px solid ${isSelected ? stage.color : stage.color + '20'}` }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: isSelected ? '#ffffff' : stage.color }}>{count}</span>
              <span style={{ fontSize: '11px', fontWeight: '600', color: isSelected ? '#ffffff' : '#475569', textAlign: 'center' }}>{stage.key}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search accounts by name, city, NPI..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={styles.searchInput}
      />

      {/* Inline Account List */}
      {(() => {
        const q = searchQuery.toLowerCase();
        const filtered = allSurgeons.filter(s => {
          if (selectedStage === 'Not Staged' && s.buying_stage) return false;
          if (selectedStage && selectedStage !== 'Not Staged' && s.buying_stage !== selectedStage) return false;
          if (q) {
            const name = (s.full_name || `${s.first_name || ''} ${s.last_name || ''}`).toLowerCase();
            const searchable = `${name} ${s.city || ''} ${s.state || ''} ${s.npi || ''} ${s.specialty || ''}`.toLowerCase();
            if (!searchable.includes(q)) return false;
          }
          return true;
        });

        if ((selectedStage || q) && filtered.length > 0) {
          return (
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={styles.sectionTitle}>{selectedStage || 'Search Results'} ({filtered.length})</span>
                {selectedStage && <button onClick={() => setSelectedStage(null)} style={{ border: 'none', background: 'none', color: '#1e3a8a', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Clear</button>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filtered.slice(0, 50).map(s => (
                  <AccountCard key={s.id} surgeon={s} latestCall={latestCallMap[s.id]} assignedRep={repMap[s.id]} cptData={cptMap[s.id]} cptPriceMap={cptPriceMap} searchQuery={searchQuery} />
                ))}
              </div>
            </div>
          );
        }
        if ((selectedStage || q) && filtered.length === 0) {
          return <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>No accounts found</div>;
        }
        return null;
      })()}

      {/* Pending Leads */}
      {pendingLeads > 0 && (
        <button
          onClick={() => navigate('/field-intel/leads')}
          style={styles.pendingBanner}
        >
          <span style={styles.pendingText}>
            {pendingLeads} pending lead{pendingLeads !== 1 ? 's' : ''} awaiting review
          </span>
          <ArrowRightIcon />
        </button>
      )}

      {/* Menu Grid */}
      <div style={styles.section}>
        <span style={styles.sectionTitle}>Tools</span>
        <div style={styles.menuGrid}>
          {menuItems.map(item => {
            const isBusy = item.key === 'export' && exporting;
            return (
              <button
                key={item.key}
                style={{
                  ...styles.menuSquare,
                  ...(item.danger ? styles.menuSquareDanger : {}),
                  ...(isBusy ? { opacity: 0.6, cursor: 'wait' } : {}),
                }}
                onClick={() => handleMenuClick(item)}
                disabled={isBusy}
              >
                <div style={{
                  ...styles.menuIconWrap,
                  ...(item.danger ? styles.menuIconWrapDanger : {}),
                }}>
                  <item.Icon />
                </div>
                <span style={{
                  ...styles.menuLabel,
                  ...(item.danger ? styles.menuLabelDanger : {}),
                }}>{isBusy ? 'Exporting...' : item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset Panel */}
      {showResetPanel && (
        <div style={styles.resetPanel}>
          <h3 style={styles.resetTitle}>Reset Data</h3>
          <div style={styles.resetButtons}>
            <button
              style={{
                ...styles.resetBtn,
                ...(confirmAction === 'data' ? styles.resetBtnConfirm : {}),
              }}
              onClick={() => handleReset('data')}
              disabled={resetting}
            >
              {resetting && confirmAction === 'data' ? 'Resetting...' : confirmAction === 'data' ? 'Tap Again to Confirm' : 'Reset Surgical Data'}
            </button>
            <button
              style={{
                ...styles.resetBtn,
                ...(confirmAction === 'roles' ? styles.resetBtnConfirm : {}),
              }}
              onClick={() => handleReset('roles')}
              disabled={resetting}
            >
              {resetting && confirmAction === 'roles' ? 'Resetting...' : confirmAction === 'roles' ? 'Tap Again to Confirm' : 'Reset Roles'}
            </button>
            <button
              style={{
                ...styles.resetBtn,
                ...styles.resetBtnAll,
                ...(confirmAction === 'all' ? styles.resetBtnConfirm : {}),
              }}
              onClick={() => handleReset('all')}
              disabled={resetting}
            >
              {resetting && confirmAction === 'all' ? 'Resetting...' : confirmAction === 'all' ? 'Tap Again to Confirm' : 'Reset All Field Intel'}
            </button>
          </div>
        </div>
      )}

      <div style={{ height: '24px' }} />

      <ExportProgressModal
        open={exportModalOpen}
        phase={exportProgress.phase}
        count={exportProgress.count}
        error={exportError}
        onClose={() => setExportModalOpen(false)}
      />
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
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  stageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  stageTile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '12px 8px',
    borderRadius: '10px',
  },
  notStagedBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  searchInput: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
  },
  pendingBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    backgroundColor: '#fefce8',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    color: '#92400e',
  },
  pendingText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  // Menu grid
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  menuSquare: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'box-shadow 0.2s ease',
  },
  menuSquareDanger: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
  },
  menuIconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconWrapDanger: {
    backgroundColor: '#fee2e2',
  },
  menuLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: '1.3',
  },
  menuLabelDanger: {
    color: '#dc2626',
  },
  resetPanel: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  resetTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#991b1b',
    margin: 0,
  },
  resetButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  resetBtn: {
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
  resetBtnAll: {
    backgroundColor: '#dc2626',
    border: '1px solid #dc2626',
    color: '#ffffff',
  },
  resetBtnConfirm: {
    backgroundColor: '#991b1b',
    border: '1px solid #991b1b',
    color: '#ffffff',
  },
};

export default AdminDashboard;
