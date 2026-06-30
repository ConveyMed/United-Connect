import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { useFieldIntel } from './FieldIntelContext';
import AccountSelector from './AccountSelector';
import PersonSelector from './PersonSelector';

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DelegationScreen = () => {
  const { user } = useAuth();
  const { role, regionIds } = useFieldIntel();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scopeTo = searchParams.get('scopeTo');

  const [subordinates, setSubordinates] = useState([]);
  const [accountPool, setAccountPool] = useState([]);
  const [delegations, setDelegations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scopedName, setScopedName] = useState('');

  // UI state
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [activeTab, setActiveTab] = useState('assigned'); // 'assigned' | 'available'
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [cptMap, setCptMap] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterSpecialties, setFilterSpecialties] = useState([]);
  const [filterStates, setFilterStates] = useState([]);
  const [filterCities, setFilterCities] = useState([]);
  const [editingLabel, setEditingLabel] = useState(null); // { personId, value }

  const isVP = role === 'vp';
  const isManager = role === 'manager';

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    // If scopeTo is set, load that user's context instead
    const targetUserId = scopeTo || user.id;
    let targetRole = role;
    let targetRegionIds = regionIds;

    if (scopeTo) {
      // Fetch scoped user's info
      const { data: scopedUser } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', scopeTo)
        .single();
      if (scopedUser) {
        setScopedName(`${scopedUser.first_name || ''} ${scopedUser.last_name || ''}`.trim() || scopedUser.email || '');
      }

      // Fetch scoped user's role and regions
      const { data: scopedAssigns } = await supabase
        .from('hierarchy_assignments')
        .select('role_tier, region_id')
        .eq('user_id', scopeTo);
      if (scopedAssigns?.length > 0) {
        targetRole = scopedAssigns[0].role_tier;
        targetRegionIds = scopedAssigns.map(a => a.region_id).filter(Boolean);
      }
    }

    const scopedIsVP = targetRole === 'vp';
    const scopedIsManager = targetRole === 'manager';

    // Fetch subordinates of the target user
    let { data: subData } = await supabase
      .from('hierarchy_assignments')
      .select('user_id, role_tier, custom_label')
      .eq('parent_user_id', targetUserId);

    let subUserIds = (subData || []).map(s => s.user_id);
    let subUsers = [];
    if (subUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', subUserIds);
      subUsers = usersData || [];
    }

    // Fetch account pool
    let pool = [];
    if (!scopeTo && role === 'admin') {
      // Admin without scope: all accounts
      const { data: surgeons } = await supabase
        .from('surgeons')
        .select('id, full_name, first_name, last_name, npi, specialty, city, state')
        .order('full_name');
      pool = surgeons || [];

      // Admin subordinates: all VPs and managers
      const { data: allAssigns } = await supabase
        .from('hierarchy_assignments')
        .select('user_id, role_tier, custom_label')
        .in('role_tier', ['vp', 'manager']);
      const allIds = (allAssigns || []).map(a => a.user_id);
      if (allIds.length > 0) {
        const { data: allUsers } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', allIds);
        subUsers = allUsers || [];
      }
      subData = allAssigns || [];
      subUserIds = allIds;
    } else if (scopedIsVP && targetRegionIds.length > 0) {
      // VP: accounts in their regions
      const { data: srData } = await supabase
        .from('surgeon_regions')
        .select('surgeon_id')
        .in('region_id', targetRegionIds);

      const surgeonIds = [...new Set((srData || []).map(r => r.surgeon_id))];
      if (surgeonIds.length > 0) {
        const { data: surgeons } = await supabase
          .from('surgeons')
          .select('id, full_name, first_name, last_name, npi, specialty, city, state')
          .in('id', surgeonIds)
          .order('full_name');
        pool = surgeons || [];
      }
    } else if (scopedIsManager) {
      // Manager: accounts delegated to them
      const { data: delToMe } = await supabase
        .from('account_delegations')
        .select('surgeon_id')
        .eq('user_id', targetUserId);

      const surgeonIds = [...new Set((delToMe || []).map(d => d.surgeon_id))];
      if (surgeonIds.length > 0) {
        const { data: surgeons } = await supabase
          .from('surgeons')
          .select('id, full_name, first_name, last_name, npi, specialty, city, state')
          .in('id', surgeonIds)
          .order('full_name');
        pool = surgeons || [];
      }
    }

    // Fetch delegations to my subordinates
    let myDelegations = [];
    if (subUserIds.length > 0) {
      const { data } = await supabase
        .from('account_delegations')
        .select('*')
        .in('user_id', subUserIds);
      myDelegations = data || [];
    }

    // Build subordinate objects with counts
    const delegationsByPerson = {};
    (myDelegations || []).forEach(d => {
      if (!delegationsByPerson[d.user_id]) {
        delegationsByPerson[d.user_id] = [];
      }
      delegationsByPerson[d.user_id].push(d.surgeon_id);
    });

    const subs = (subData || []).map(s => {
      const userObj = subUsers.find(u => u.id === s.user_id);
      const name = userObj
        ? `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() || userObj.email
        : 'Unknown';
      return {
        id: s.user_id,
        name,
        role: s.role_tier,
        label: s.custom_label,
        assignedCount: (delegationsByPerson[s.user_id] || []).length,
        totalCount: pool.length,
      };
    });

    setSubordinates(subs);
    setAccountPool(pool);
    setDelegations(myDelegations || []);
    setLoading(false);
  }, [user?.id, role, regionIds, isVP, isManager, scopeTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch CPT data to enrich accounts with volume/market potential
  useEffect(() => {
    if (accountPool.length === 0) { setCptMap({}); return; }
    const fetchCpt = async () => {
      // Fetch all CPT rows -- Supabase defaults to 1000, so paginate
      let allCptRows = [];
      let cptOffset = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from('surgeon_cpt_data')
          .select('surgeon_id, cpt_code, annual_volume')
          .range(cptOffset, cptOffset + PAGE - 1);
        if (!data || data.length === 0) break;
        allCptRows = allCptRows.concat(data);
        if (data.length < PAGE) break;
        cptOffset += PAGE;
      }
      const cptRes = { data: allCptRows };
      const { data: pricesData } = await supabase.from('cpt_prices').select('cpt_code, average_price');
      const pricesRes = { data: pricesData };
      const priceByCode = {};
      (pricesRes.data || []).forEach(p => {
        if (p.average_price != null) priceByCode[p.cpt_code] = parseFloat(p.average_price);
      });
      const poolIds = new Set(accountPool.map(a => a.id));
      const map = {};
      (cptRes.data || []).forEach(row => {
        if (!poolIds.has(row.surgeon_id)) return;
        if (!map[row.surgeon_id]) map[row.surgeon_id] = { totalVolume: 0, marketPotential: 0, procedures: [] };
        const vol = row.annual_volume || 0;
        const price = priceByCode[row.cpt_code] || 0;
        map[row.surgeon_id].totalVolume += vol;
        map[row.surgeon_id].marketPotential += vol * price;
        map[row.surgeon_id].procedures.push({ cpt_code: row.cpt_code, volume: vol, price });
      });
      setCptMap(map);
    };
    fetchCpt();
  }, [accountPool]);

  // Stats
  const totalAccounts = accountPool.length;
  const assignedAccounts = new Set(delegations.map(d => d.surgeon_id)).size;
  const unassignedAccounts = totalAccounts - assignedAccounts;

  // Get accounts for selected person -- enriched with CPT data
  const personAccounts = useMemo(() => {
    if (!selectedPersonId) return [];
    const personDelegations = delegations.filter(d => d.user_id === selectedPersonId);
    const delegatedSurgeonIds = new Set(personDelegations.map(d => d.surgeon_id));
    const allDelegatedIds = new Set(delegations.map(d => d.surgeon_id));

    let base;
    if (activeTab === 'assigned') {
      base = accountPool.filter(a => delegatedSurgeonIds.has(a.id));
    } else {
      base = accountPool.filter(a => !allDelegatedIds.has(a.id));
    }

    return base.map(a => ({
      ...a,
      totalVolume: cptMap[a.id]?.totalVolume || 0,
      marketPotential: cptMap[a.id]?.marketPotential || 0,
      procedures: cptMap[a.id]?.procedures || [],
    }));
  }, [selectedPersonId, delegations, accountPool, activeTab, cptMap]);

  // Filter options - cascading: State -> City -> Specialty
  const stateOptions = useMemo(() => {
    const set = new Set();
    personAccounts.forEach(a => { if (a.state) set.add(a.state); });
    return [...set].sort();
  }, [personAccounts]);

  const cityOptions = useMemo(() => {
    const set = new Set();
    const pool = filterStates.length > 0
      ? personAccounts.filter(a => filterStates.includes(a.state))
      : personAccounts;
    pool.forEach(a => { if (a.city) set.add(a.city); });
    return [...set].sort();
  }, [personAccounts, filterStates]);

  const specialtyOptions = useMemo(() => {
    const set = new Set();
    let pool = personAccounts;
    if (filterStates.length > 0) pool = pool.filter(a => filterStates.includes(a.state));
    if (filterCities.length > 0) pool = pool.filter(a => filterCities.includes(a.city));
    pool.forEach(a => { if (a.specialty) set.add(a.specialty); });
    return [...set].sort();
  }, [personAccounts, filterStates, filterCities]);

  const activeFilterCount = filterSpecialties.length + filterStates.length + filterCities.length;

  const filteredAccounts = useMemo(() => {
    return personAccounts.filter(a => {
      if (filterSpecialties.length > 0 && !filterSpecialties.includes(a.specialty)) return false;
      if (filterStates.length > 0 && !filterStates.includes(a.state)) return false;
      if (filterCities.length > 0 && !filterCities.includes(a.city)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (a.full_name || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase();
        return (
          name.includes(q) ||
          (a.npi && a.npi.includes(q)) ||
          (a.specialty && a.specialty.toLowerCase().includes(q)) ||
          (a.city && a.city.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'volume') return (b.totalVolume || 0) - (a.totalVolume || 0);
      if (sortBy === 'potential') return (b.marketPotential || 0) - (a.marketPotential || 0);
      const nameA = (a.full_name || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase();
      const nameB = (b.full_name || `${b.first_name || ''} ${b.last_name || ''}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [personAccounts, filterSpecialties, filterStates, filterCities, searchQuery, sortBy]);

  const handleEditLabel = (personId, currentLabel) => {
    setEditingLabel({ personId, value: currentLabel });
  };

  const handleSaveLabel = async () => {
    if (!editingLabel) return;
    const { error } = await supabase
      .from('hierarchy_assignments')
      .update({ custom_label: editingLabel.value || null })
      .eq('user_id', editingLabel.personId)
      .eq('parent_user_id', user.id);

    if (error) {
      console.error('[DelegationScreen] Label update error:', error);
    } else {
      setSubordinates(prev => prev.map(s =>
        s.id === editingLabel.personId ? { ...s, label: editingLabel.value || null } : s
      ));
    }
    setEditingLabel(null);
  };

  const toggleFilter = (level, val) => {
    if (level === 'state') {
      setFilterStates(prev => {
        const next = prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val];
        setFilterCities(c => c.filter(city =>
          personAccounts.some(a => (next.length === 0 || next.includes(a.state)) && a.city === city)
        ));
        setFilterSpecialties(s => s.filter(spec =>
          personAccounts.some(a => (next.length === 0 || next.includes(a.state)) && a.specialty === spec)
        ));
        return next;
      });
    } else if (level === 'city') {
      setFilterCities(prev => {
        const next = prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val];
        setFilterSpecialties(s => s.filter(spec =>
          personAccounts.some(a =>
            (filterStates.length === 0 || filterStates.includes(a.state)) &&
            (next.length === 0 || next.includes(a.city)) &&
            a.specialty === spec
          )
        ));
        return next;
      });
    } else {
      setFilterSpecialties(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
    }
    setSelectedIds([]);
  };

  const clearAllFilters = () => {
    setFilterSpecialties([]);
    setFilterStates([]);
    setFilterCities([]);
    setSelectedIds([]);
  };

  const handleAssign = async () => {
    if (!selectedPersonId || selectedIds.length === 0) return;
    setSaving(true);

    const rows = selectedIds.map(surgeonId => ({
      surgeon_id: surgeonId,
      user_id: selectedPersonId,
      delegated_by: user.id,
    }));

    const { error } = await supabase.from('account_delegations').insert(rows);
    if (error) {
      console.error('[DelegationScreen] Assign error:', error);
      alert('Failed to assign: ' + error.message);
    }

    setSaving(false);
    setSelectedIds([]);
    fetchData();
  };

  const handleUnassign = async () => {
    if (!selectedPersonId || selectedIds.length === 0) return;
    setSaving(true);

    const { error } = await supabase
      .from('account_delegations')
      .delete()
      .eq('user_id', selectedPersonId)
      .in('surgeon_id', selectedIds);

    if (error) {
      console.error('[DelegationScreen] Unassign error:', error);
      alert('Failed to unassign: ' + error.message);
    }

    setSaving(false);
    setSelectedIds([]);
    fetchData();
  };

  const handleReassign = async (fromPersonId, toPersonId) => {
    if (!fromPersonId || !toPersonId || selectedIds.length === 0) return;
    setSaving(true);

    // Delete from old person
    await supabase
      .from('account_delegations')
      .delete()
      .eq('user_id', fromPersonId)
      .in('surgeon_id', selectedIds);

    // Insert for new person
    const rows = selectedIds.map(surgeonId => ({
      surgeon_id: surgeonId,
      user_id: toPersonId,
      delegated_by: user.id,
    }));

    const { error } = await supabase.from('account_delegations').insert(rows);
    if (error) {
      console.error('[DelegationScreen] Reassign error:', error);
    }

    setSaving(false);
    setSelectedIds([]);
    fetchData();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  const isAdmin = role === 'admin';
  if (!isVP && !isManager && !isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <span style={styles.emptyText}>Delegation is available for VPs and Managers.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h2 style={styles.title}>Delegate Accounts{scopedName ? ` - ${scopedName}` : ''}</h2>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{totalAccounts}</span>
          <span style={styles.statLabel}>Total</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={{ ...styles.statValue, color: '#059669' }}>{assignedAccounts}</span>
          <span style={styles.statLabel}>Assigned</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={{ ...styles.statValue, color: '#dc2626' }}>{unassignedAccounts}</span>
          <span style={styles.statLabel}>Unassigned</span>
        </div>
      </div>

      {/* Person Cards */}
      <div style={styles.section}>
        <span style={styles.sectionTitle}>Team</span>
        <PersonSelector
          people={subordinates}
          selectedPersonId={selectedPersonId}
          onSelect={(id) => {
            setSelectedPersonId(id === selectedPersonId ? null : id);
            setSelectedIds([]);
            setSearchQuery('');
            setActiveTab('assigned');
            setFilterSpecialties([]);
            setFilterStates([]);
            setFilterCities([]);
            setSortBy('name');
          }}
          onEditLabel={handleEditLabel}
        />
      </div>

      {/* Label Editing Modal */}
      {editingLabel && (
        <div style={styles.modalOverlay} onClick={() => setEditingLabel(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <span style={styles.modalTitle}>Set Label</span>
            <span style={styles.modalHint}>
              A private note for you -- this person won't see it
            </span>
            <input
              type="text"
              placeholder="e.g. NorCal, Top Volume, Orange County..."
              value={editingLabel.value}
              onChange={(e) => setEditingLabel({ ...editingLabel, value: e.target.value })}
              style={styles.modalInput}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLabel(); }}
            />
            <div style={styles.modalBtnRow}>
              <button onClick={() => setEditingLabel(null)} style={styles.modalCancelBtn}>Cancel</button>
              <button onClick={handleSaveLabel} style={styles.modalSaveBtn}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View for Selected Person */}
      {selectedPersonId && (
        <div style={styles.detailSection}>
          <div style={styles.tabRow}>
            <button
              onClick={() => { setActiveTab('assigned'); setSelectedIds([]); }}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'assigned' ? styles.tabBtnActive : {}),
              }}
            >
              Assigned
            </button>
            <button
              onClick={() => { setActiveTab('available'); setSelectedIds([]); }}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'available' ? styles.tabBtnActive : {}),
              }}
            >
              Unassigned
            </button>
          </div>

          {/* Sort */}
          <div style={styles.sortRow}>
            <span style={styles.sortLabel}>Sort by</span>
            {[
              { key: 'name', label: 'Name' },
              { key: 'volume', label: 'Volume' },
              { key: 'potential', label: 'Market Potential' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                style={{
                  ...styles.sortPill,
                  ...(sortBy === opt.key ? styles.sortPillActive : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filter Toggle */}
          <div style={styles.filterTopRow}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                ...styles.filterToggleBtn,
                ...(showFilters || activeFilterCount > 0 ? styles.filterToggleBtnActive : {}),
              }}
            >
              <FilterIcon />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span style={styles.filterBadge}>{activeFilterCount}</span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} style={styles.clearFiltersBtn}>Clear all</button>
            )}
          </div>

          {/* Active Filter Pills */}
          {activeFilterCount > 0 && (
            <div style={styles.activePillRow}>
              {filterStates.map(s => (
                <button key={`st-${s}`} onClick={() => toggleFilter('state', s)} style={styles.activePill}>
                  <span style={styles.activePillLabel}>{s}</span>
                  <CloseIcon />
                </button>
              ))}
              {filterCities.map(s => (
                <button key={`ct-${s}`} onClick={() => toggleFilter('city', s)} style={styles.activePill}>
                  <span style={styles.activePillLabel}>{s}</span>
                  <CloseIcon />
                </button>
              ))}
              {filterSpecialties.map(s => (
                <button key={`sp-${s}`} onClick={() => toggleFilter('specialty', s)} style={styles.activePill}>
                  <span style={styles.activePillLabel}>{s}</span>
                  <CloseIcon />
                </button>
              ))}
            </div>
          )}

          {/* Filter Panel */}
          {showFilters && (
            <div style={styles.filterPanel}>
              {stateOptions.length > 0 && (
                <div style={styles.filterGroup}>
                  <span style={styles.filterGroupLabel}>State ({stateOptions.length})</span>
                  <div style={styles.filterPillRow}>
                    {stateOptions.map(s => (
                      <button key={s} onClick={() => toggleFilter('state', s)}
                        style={{ ...styles.filterPill, ...(filterStates.includes(s) ? styles.filterPillActive : {}) }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {cityOptions.length > 0 && (
                <div style={styles.filterGroup}>
                  <span style={styles.filterGroupLabel}>City ({cityOptions.length})</span>
                  <div style={styles.filterPillRow}>
                    {cityOptions.map(s => (
                      <button key={s} onClick={() => toggleFilter('city', s)}
                        style={{ ...styles.filterPill, ...(filterCities.includes(s) ? styles.filterPillActive : {}) }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {specialtyOptions.length > 0 && (
                <div style={styles.filterGroup}>
                  <span style={styles.filterGroupLabel}>Specialty ({specialtyOptions.length})</span>
                  <div style={styles.filterPillRow}>
                    {specialtyOptions.map(s => (
                      <button key={s} onClick={() => toggleFilter('specialty', s)}
                        style={{ ...styles.filterPill, ...(filterSpecialties.includes(s) ? styles.filterPillActive : {}) }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setShowFilters(false)} style={styles.filterDoneBtn}>Done</button>
            </div>
          )}

          {activeFilterCount > 0 && (
            <span style={styles.filterResultText}>
              {filteredAccounts.length.toLocaleString()} of {personAccounts.length.toLocaleString()} accounts match
            </span>
          )}

          <AccountSelector
            accounts={filteredAccounts}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      )}

      {/* Sticky Action Button */}
      {selectedIds.length > 0 && selectedPersonId && (
        <div style={styles.stickyBar}>
          <button
            onClick={activeTab === 'available' ? handleAssign : handleUnassign}
            disabled={saving}
            style={{
              ...styles.actionBtn,
              backgroundColor: activeTab === 'available' ? '#1e3a8a' : '#dc2626',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving
              ? 'Saving...'
              : activeTab === 'available'
                ? `Assign ${selectedIds.length} Selected`
                : `Unassign ${selectedIds.length} Selected`
            }
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    paddingBottom: '80px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#1e3a8a',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    flex: 1,
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '48px 0',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e3a8a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  emptyText: {
    fontSize: '15px',
    color: '#94a3b8',
    textAlign: 'center',
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
    padding: '14px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  statDivider: {
    width: '1px',
    height: '32px',
    backgroundColor: '#e2e8f0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '14px',
  },
  tabRow: {
    display: 'flex',
    gap: '6px',
  },
  tabBtn: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: '1px solid #1e3a8a',
    fontWeight: '600',
  },
  // Sort styles
  sortRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sortLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    marginRight: '4px',
  },
  sortPill: {
    padding: '5px 10px',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  sortPillActive: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: '1px solid #1e3a8a',
  },
  // Filter styles
  filterTopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  filterToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  filterToggleBtnActive: {
    backgroundColor: '#eff6ff',
    color: '#1e3a8a',
    border: '1px solid #93c5fd',
    fontWeight: '600',
  },
  filterBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '700',
  },
  clearFiltersBtn: {
    padding: '0',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#dc2626',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  activePillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  activePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    borderRadius: '16px',
    border: '1px solid #93c5fd',
    backgroundColor: '#eff6ff',
    color: '#1e3a8a',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  activePillLabel: {
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  filterPanel: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterGroupLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  filterPillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  filterPill: {
    padding: '5px 10px',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  filterPillActive: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: '1px solid #1e3a8a',
  },
  filterDoneBtn: {
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
  filterResultText: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '24px',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
  },
  modalHint: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  modalInput: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '15px',
    color: '#1e293b',
    outline: 'none',
  },
  modalBtnRow: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  modalSaveBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  stickyBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 16px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.06)',
    zIndex: 100,
  },
  actionBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
};

export default DelegationScreen;
