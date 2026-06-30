import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import AccountSelector from '../AccountSelector';

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

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

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const BATCH_SIZE = 500;

const RegionAccountAssigner = () => {
  const navigate = useNavigate();
  const [regions, setRegions] = useState([]);
  const [selectedRegionId, setSelectedRegionId] = useState(null); // null = Unassigned tab
  const [accounts, setAccounts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [cptMap, setCptMap] = useState({});
  const [showCreateRegion, setShowCreateRegion] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Action bar state
  const [actionType, setActionType] = useState(null); // 'assign' | 'reassign' | null
  const [targetRegionId, setTargetRegionId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterSpecialties, setFilterSpecialties] = useState([]);
  const [filterStates, setFilterStates] = useState([]);
  const [filterCities, setFilterCities] = useState([]);
  const [filterSites, setFilterSites] = useState([]);

  const isUnassignedTab = selectedRegionId === null;

  // Fetch regions on mount
  useEffect(() => {
    const fetchRegions = async () => {
      const { data } = await supabase.from('regions').select('*').order('name');
      if (data) setRegions(data);
    };
    fetchRegions();
  }, []);

  // Create region inline
  const handleCreateRegion = async () => {
    if (!newRegionName.trim()) return;
    const { data, error } = await supabase
      .from('regions')
      .insert({ name: newRegionName.trim() })
      .select()
      .single();
    if (error) {
      alert('Failed to create region: ' + error.message);
      return;
    }
    setRegions(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedRegionId(data.id);
    setNewRegionName('');
    setShowCreateRegion(false);
  };

  // Fetch accounts + CPT data together
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setSelectedIds([]);
      setActionType(null);
      setTargetRegionId(null);

      const SZ = 1000;

      // Fetch surgeons, CPT data, and prices in parallel
      const surgeonsPromise = (async () => {
        let all = [];
        let offset = 0;
        while (true) {
          const { data } = await supabase
            .from('surgeons')
            .select('id, full_name, first_name, last_name, npi, specialty, city, state, site_of_care')
            .order('full_name')
            .range(offset, offset + SZ - 1);
          if (!data || data.length === 0) break;
          all = all.concat(data);
          if (data.length < SZ) break;
          offset += SZ;
        }
        return all;
      })();

      const assignmentsPromise = (async () => {
        if (isUnassignedTab) {
          let all = [];
          let offset = 0;
          while (true) {
            const { data } = await supabase
              .from('surgeon_regions')
              .select('surgeon_id')
              .range(offset, offset + SZ - 1);
            if (!data || data.length === 0) break;
            all = all.concat(data);
            if (data.length < SZ) break;
            offset += SZ;
          }
          return all;
        } else {
          const { data } = await supabase
            .from('surgeon_regions')
            .select('surgeon_id')
            .eq('region_id', selectedRegionId);
          return data || [];
        }
      })();

      const cptPromise = (async () => {
        let all = [];
        let offset = 0;
        while (true) {
          const { data } = await supabase
            .from('surgeon_cpt_data')
            .select('surgeon_id, cpt_code, annual_volume')
            .range(offset, offset + SZ - 1);
          if (!data || data.length === 0) break;
          all = all.concat(data);
          if (data.length < SZ) break;
          offset += SZ;
        }
        return all;
      })();

      const pricesPromise = supabase.from('cpt_prices').select('cpt_code, average_price');

      const [allSurgeons, assignments, allCptRows, pricesRes] = await Promise.all([
        surgeonsPromise, assignmentsPromise, cptPromise, pricesPromise,
      ]);

      // Filter surgeons by tab
      const idSet = new Set(assignments.map(r => r.surgeon_id));
      const filteredSurgeons = isUnassignedTab
        ? allSurgeons.filter(s => !idSet.has(s.id))
        : allSurgeons.filter(s => idSet.has(s.id));

      // Build CPT enrichment map
      const priceByCode = {};
      const descByCode = {};
      (pricesRes.data || []).forEach(p => {
        if (p.average_price != null) priceByCode[p.cpt_code] = parseFloat(p.average_price);
        if (p.cpt_description) descByCode[p.cpt_code] = p.cpt_description;
      });

      const accountIds = new Set(filteredSurgeons.map(a => a.id));
      const map = {};
      allCptRows.forEach(row => {
        if (!accountIds.has(row.surgeon_id)) return;
        if (!map[row.surgeon_id]) map[row.surgeon_id] = { totalVolume: 0, marketPotential: 0, procedures: [] };
        const vol = row.annual_volume || 0;
        const price = priceByCode[row.cpt_code] || 0;
        map[row.surgeon_id].totalVolume += vol;
        map[row.surgeon_id].marketPotential += vol * price;
        map[row.surgeon_id].procedures.push({
          cpt_code: row.cpt_code,
          description: descByCode[row.cpt_code] || row.cpt_code,
          volume: vol,
          price: price,
        });
      });

      setCptMap(map);
      setAccounts(filteredSurgeons);
      setLoading(false);
    };

    fetchAll();
  }, [selectedRegionId, refreshKey]);

  // Enrich accounts with CPT aggregates
  const enrichedAccounts = useMemo(() => {
    return accounts.map(a => ({
      ...a,
      totalVolume: cptMap[a.id]?.totalVolume || 0,
      marketPotential: cptMap[a.id]?.marketPotential || 0,
      procedures: cptMap[a.id]?.procedures || [],
    }));
  }, [accounts, cptMap]);

  // Extract unique filter options -- cascading: State > City > Site of Care > Specialty
  // State always shows all options (no upstream filter)
  const stateOptions = useMemo(() => {
    const set = new Set();
    accounts.forEach(a => { if (a.state) set.add(a.state); });
    return [...set].sort();
  }, [accounts]);

  // City narrows by selected states
  const cityOptions = useMemo(() => {
    const pool = filterStates.length > 0
      ? accounts.filter(a => filterStates.includes(a.state))
      : accounts;
    const set = new Set();
    pool.forEach(a => { if (a.city) set.add(a.city); });
    return [...set].sort();
  }, [accounts, filterStates]);

  // Site of Care narrows by selected states + cities
  const siteOptions = useMemo(() => {
    const pool = accounts.filter(a =>
      (filterStates.length === 0 || filterStates.includes(a.state)) &&
      (filterCities.length === 0 || filterCities.includes(a.city))
    );
    const set = new Set();
    pool.forEach(a => { if (a.site_of_care) set.add(a.site_of_care); });
    return [...set].sort();
  }, [accounts, filterStates, filterCities]);

  // Specialty narrows by selected states + cities + sites
  const specialtyOptions = useMemo(() => {
    const pool = accounts.filter(a =>
      (filterStates.length === 0 || filterStates.includes(a.state)) &&
      (filterCities.length === 0 || filterCities.includes(a.city)) &&
      (filterSites.length === 0 || filterSites.includes(a.site_of_care))
    );
    const set = new Set();
    pool.forEach(a => { if (a.specialty) set.add(a.specialty); });
    return [...set].sort();
  }, [accounts, filterStates, filterCities, filterSites]);

  const activeFilterCount = filterSpecialties.length + filterStates.length + filterCities.length + filterSites.length;

  // Apply search + filters + sort
  const filtered = useMemo(() => {
    return enrichedAccounts.filter((a) => {
      // Specialty filter
      if (filterSpecialties.length > 0 && !filterSpecialties.includes(a.specialty)) {
        return false;
      }
      // State filter
      if (filterStates.length > 0 && !filterStates.includes(a.state)) {
        return false;
      }
      // City filter
      if (filterCities.length > 0 && !filterCities.includes(a.city)) {
        return false;
      }
      // Site of care filter
      if (filterSites.length > 0 && !filterSites.includes(a.site_of_care)) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (a.full_name || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase();
        return (
          name.includes(q) ||
          (a.npi && a.npi.includes(q)) ||
          (a.specialty && a.specialty.toLowerCase().includes(q)) ||
          (a.city && a.city.toLowerCase().includes(q)) ||
          (a.state && a.state.toLowerCase().includes(q))
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
  }, [enrichedAccounts, filterSpecialties, filterStates, filterCities, filterSites, searchQuery, sortBy]);

  const refreshAccounts = () => {
    setRefreshKey(k => k + 1);
  };

  const handleAssign = async (toRegionId) => {
    if (selectedIds.length === 0 || !toRegionId) return;
    setSaving(true);

    for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
      const batch = selectedIds.slice(i, i + BATCH_SIZE).map(surgeonId => ({
        surgeon_id: surgeonId,
        region_id: toRegionId,
      }));
      const { error } = await supabase.from('surgeon_regions').upsert(batch, { onConflict: 'surgeon_id,region_id' });
      if (error) {
        console.error('[RegionAccountAssigner] Insert error:', error);
        alert('Failed to assign accounts: ' + error.message);
        break;
      }
    }

    setSaving(false);
    setActionType(null);
    setTargetRegionId(null);
    refreshAccounts();
  };

  const handleUnassign = async () => {
    if (selectedIds.length === 0 || !selectedRegionId) return;
    setSaving(true);

    for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
      const batch = selectedIds.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('surgeon_regions')
        .delete()
        .eq('region_id', selectedRegionId)
        .in('surgeon_id', batch);
      if (error) {
        console.error('[RegionAccountAssigner] Delete error:', error);
        alert('Failed to unassign accounts: ' + error.message);
        break;
      }
    }

    setSaving(false);
    refreshAccounts();
  };

  const handleReassign = async (toRegionId) => {
    if (selectedIds.length === 0 || !selectedRegionId || !toRegionId) return;
    setSaving(true);

    // Remove from current region
    for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
      const batch = selectedIds.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('surgeon_regions')
        .delete()
        .eq('region_id', selectedRegionId)
        .in('surgeon_id', batch);
      if (error) {
        console.error('[RegionAccountAssigner] Delete error:', error);
        alert('Failed to reassign accounts: ' + error.message);
        setSaving(false);
        return;
      }
    }

    // Add to target region
    for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
      const batch = selectedIds.slice(i, i + BATCH_SIZE).map(surgeonId => ({
        surgeon_id: surgeonId,
        region_id: toRegionId,
      }));
      const { error } = await supabase.from('surgeon_regions').upsert(batch, { onConflict: 'surgeon_id,region_id' });
      if (error) {
        console.error('[RegionAccountAssigner] Insert error:', error);
        alert('Failed to reassign accounts: ' + error.message);
        break;
      }
    }

    setSaving(false);
    setActionType(null);
    setTargetRegionId(null);
    refreshAccounts();
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);

    // Delete from surgeon_regions first (any region assignments)
    for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
      const batch = selectedIds.slice(i, i + BATCH_SIZE);
      await supabase
        .from('surgeon_regions')
        .delete()
        .in('surgeon_id', batch);
    }

    // Delete from surgeon_cpt_data
    for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
      const batch = selectedIds.slice(i, i + BATCH_SIZE);
      await supabase
        .from('surgeon_cpt_data')
        .delete()
        .in('surgeon_id', batch);
    }

    // Delete from surgeons
    for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
      const batch = selectedIds.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('surgeons')
        .delete()
        .in('id', batch);
      if (error) {
        console.error('[RegionAccountAssigner] Delete surgeon error:', error);
        alert('Failed to delete accounts: ' + error.message);
        break;
      }
    }

    setSaving(false);
    setShowDeleteConfirm(false);
    refreshAccounts();
  };

  const toggleState = (val) => {
    setFilterStates(prev => {
      const next = prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val];
      // Clear downstream selections that no longer exist in narrowed options
      const stateFiltered = next.length > 0 ? accounts.filter(a => next.includes(a.state)) : accounts;
      const validCities = new Set(stateFiltered.map(a => a.city).filter(Boolean));
      const validSites = new Set(stateFiltered.map(a => a.site_of_care).filter(Boolean));
      const validSpecs = new Set(stateFiltered.map(a => a.specialty).filter(Boolean));
      setFilterCities(prev => prev.filter(c => validCities.has(c)));
      setFilterSites(prev => prev.filter(s => validSites.has(s)));
      setFilterSpecialties(prev => prev.filter(s => validSpecs.has(s)));
      return next;
    });
    setSelectedIds([]);
  };

  const toggleCity = (val) => {
    setFilterCities(prev => {
      const next = prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val];
      // Clear downstream selections that no longer exist
      const upstream = accounts.filter(a =>
        (filterStates.length === 0 || filterStates.includes(a.state)) &&
        (next.length === 0 || next.includes(a.city))
      );
      const validSites = new Set(upstream.map(a => a.site_of_care).filter(Boolean));
      const validSpecs = new Set(upstream.map(a => a.specialty).filter(Boolean));
      setFilterSites(prev => prev.filter(s => validSites.has(s)));
      setFilterSpecialties(prev => prev.filter(s => validSpecs.has(s)));
      return next;
    });
    setSelectedIds([]);
  };

  const toggleSite = (val) => {
    setFilterSites(prev => {
      const next = prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val];
      // Clear downstream specialty selections that no longer exist
      const upstream = accounts.filter(a =>
        (filterStates.length === 0 || filterStates.includes(a.state)) &&
        (filterCities.length === 0 || filterCities.includes(a.city)) &&
        (next.length === 0 || next.includes(a.site_of_care))
      );
      const validSpecs = new Set(upstream.map(a => a.specialty).filter(Boolean));
      setFilterSpecialties(prev => prev.filter(s => validSpecs.has(s)));
      return next;
    });
    setSelectedIds([]);
  };

  const toggleSpecialty = (val) => {
    setFilterSpecialties(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
    setSelectedIds([]);
  };

  const clearAllFilters = () => {
    setFilterSpecialties([]);
    setFilterStates([]);
    setFilterCities([]);
    setFilterSites([]);
    setSelectedIds([]);
  };

  return (
    <div style={{ ...styles.container, paddingBottom: selectedIds.length > 0 ? '100px' : '16px' }}>
      <div style={styles.headerRow}>
        <button onClick={() => navigate('/field-intel')} style={styles.backBtn}>
          <ArrowLeftIcon />
        </button>
        <h2 style={styles.title}>Assign Accounts to Regions</h2>
      </div>

      {/* Region Selector */}
      <div style={styles.regionRow}>
        <label style={styles.regionLabel}>Region</label>
        <div style={styles.pillRow}>
          <button
            onClick={() => { setSelectedRegionId(null); setSelectedIds([]); setActionType(null); }}
            style={{
              ...styles.pill,
              ...(isUnassignedTab ? styles.pillActive : {}),
            }}
          >
            Unassigned
          </button>
          {regions.map((r) => (
            <button
              key={r.id}
              onClick={() => { setSelectedRegionId(r.id); setSelectedIds([]); setActionType(null); }}
              style={{
                ...styles.pill,
                ...(!isUnassignedTab && selectedRegionId === r.id ? styles.pillActive : {}),
              }}
            >
              {r.name}
            </button>
          ))}
          <button
            onClick={() => setShowCreateRegion(true)}
            style={styles.createRegionBtn}
          >
            <PlusIcon /> Region
          </button>
        </div>
      </div>

      {/* Create Region Inline */}
      {showCreateRegion && (
        <div style={styles.createRegionCard}>
          <input
            type="text"
            placeholder="Region name (e.g. West Coast, Texas, High Volume Ortho)"
            value={newRegionName}
            onChange={(e) => setNewRegionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateRegion()}
            autoFocus
            style={styles.createRegionInput}
          />
          <div style={styles.createRegionActions}>
            <button onClick={handleCreateRegion} style={styles.createRegionSaveBtn}>Create</button>
            <button onClick={() => { setShowCreateRegion(false); setNewRegionName(''); }} style={styles.createRegionCancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter Button + Active Pills */}
      {!loading && (
        <div style={styles.filterSection}>
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
              <button onClick={clearAllFilters} style={styles.clearFiltersBtn}>
                Clear all
              </button>
            )}
          </div>

          {/* Active Filter Pills */}
          {activeFilterCount > 0 && (
            <div style={styles.activePillRow}>
              {filterSpecialties.map(s => (
                <button key={`sp-${s}`} onClick={() => toggleSpecialty(s)} style={styles.activePill}>
                  <span style={styles.activePillLabel}>{s}</span>
                  <CloseIcon />
                </button>
              ))}
              {filterStates.map(s => (
                <button key={`st-${s}`} onClick={() => toggleState(s)} style={styles.activePill}>
                  <span style={styles.activePillLabel}>{s}</span>
                  <CloseIcon />
                </button>
              ))}
              {filterCities.map(s => (
                <button key={`ct-${s}`} onClick={() => toggleCity(s)} style={styles.activePill}>
                  <span style={styles.activePillLabel}>{s}</span>
                  <CloseIcon />
                </button>
              ))}
              {filterSites.map(s => (
                <button key={`si-${s}`} onClick={() => toggleSite(s)} style={styles.activePill}>
                  <span style={styles.activePillLabel}>{s}</span>
                  <CloseIcon />
                </button>
              ))}
            </div>
          )}

          {/* Filter Panel */}
          {showFilters && (
            <div style={styles.filterPanel}>
              {/* State */}
              {stateOptions.length > 0 && (
                <div style={styles.filterGroup}>
                  <span style={styles.filterGroupLabel}>
                    State ({stateOptions.length})
                  </span>
                  <div style={styles.filterPillRow}>
                    {stateOptions.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleState(s)}
                        style={{
                          ...styles.filterPill,
                          ...(filterStates.includes(s) ? styles.filterPillActive : {}),
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* City */}
              {cityOptions.length > 0 && (
                <div style={styles.filterGroup}>
                  <span style={styles.filterGroupLabel}>
                    City ({cityOptions.length})
                  </span>
                  <div style={styles.filterPillRow}>
                    {cityOptions.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleCity(s)}
                        style={{
                          ...styles.filterPill,
                          ...(filterCities.includes(s) ? styles.filterPillActive : {}),
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Site of Care */}
              {siteOptions.length > 0 && (
                <div style={styles.filterGroup}>
                  <span style={styles.filterGroupLabel}>
                    Site of Care ({siteOptions.length})
                  </span>
                  <div style={styles.filterPillRow}>
                    {siteOptions.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSite(s)}
                        style={{
                          ...styles.filterPill,
                          ...(filterSites.includes(s) ? styles.filterPillActive : {}),
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Specialty */}
              {specialtyOptions.length > 0 && (
                <div style={styles.filterGroup}>
                  <span style={styles.filterGroupLabel}>
                    Specialty ({specialtyOptions.length})
                  </span>
                  <div style={styles.filterPillRow}>
                    {specialtyOptions.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSpecialty(s)}
                        style={{
                          ...styles.filterPill,
                          ...(filterSpecialties.includes(s) ? styles.filterPillActive : {}),
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setShowFilters(false)} style={styles.filterDoneBtn}>
                Done
              </button>
            </div>
          )}

          {/* Results summary */}
          {activeFilterCount > 0 && (
            <span style={styles.filterResultText}>
              {filtered.length.toLocaleString()} of {accounts.length.toLocaleString()} accounts match filters
            </span>
          )}
        </div>
      )}

      {/* Sort Options */}
      {!loading && (
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
      )}

      {/* Account List */}
      {loading ? (
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
        </div>
      ) : (
        <AccountSelector
          accounts={filtered}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Delete {selectedIds.length.toLocaleString()} Account{selectedIds.length !== 1 ? 's' : ''}?</h3>
            <p style={styles.modalText}>
              This will permanently delete the selected surgeon{selectedIds.length !== 1 ? 's' : ''}, including all region assignments and CPT data. This cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: '#dc2626',
                  opacity: saving ? 0.6 : 1,
                  flex: 1,
                }}
              >
                {saving ? 'Deleting...' : 'Delete Permanently'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ ...styles.cancelBtn, flex: 1, textAlign: 'center' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Action Bar */}
      {selectedIds.length > 0 && !showDeleteConfirm && (
        <div style={styles.stickyBar}>
          {/* Region picker for assign/reassign */}
          {actionType && (
            <div style={styles.pickerWrap}>
              <span style={styles.pickerLabel}>
                {actionType === 'assign' ? 'Assign to:' : 'Reassign to:'}
              </span>
              <div style={styles.pickerPillRow}>
                {regions
                  .filter(r => actionType === 'reassign' ? r.id !== selectedRegionId : true)
                  .map(r => (
                    <button
                      key={r.id}
                      onClick={() => setTargetRegionId(r.id)}
                      style={{
                        ...styles.pickerPill,
                        ...(targetRegionId === r.id ? styles.pickerPillActive : {}),
                      }}
                    >
                      {r.name}
                    </button>
                  ))
                }
              </div>
              <div style={styles.pickerActions}>
                <button
                  onClick={() => {
                    if (!targetRegionId) return;
                    if (actionType === 'assign') handleAssign(targetRegionId);
                    else handleReassign(targetRegionId);
                  }}
                  disabled={saving || !targetRegionId}
                  style={{
                    ...styles.actionBtn,
                    opacity: (saving || !targetRegionId) ? 0.5 : 1,
                    backgroundColor: '#1e3a8a',
                    flex: 1,
                  }}
                >
                  {saving ? 'Working...' : `Confirm ${actionType === 'assign' ? 'Assign' : 'Reassign'} (${selectedIds.length.toLocaleString()})`}
                </button>
                <button
                  onClick={() => { setActionType(null); setTargetRegionId(null); }}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action buttons - Unassigned tab */}
          {!actionType && isUnassignedTab && (
            <div style={styles.actionRow}>
              <button
                onClick={() => setActionType('assign')}
                style={{ ...styles.actionBtn, backgroundColor: '#1e3a8a', flex: 1 }}
              >
                Assign {selectedIds.length.toLocaleString()} Selected
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ ...styles.actionBtn, backgroundColor: '#dc2626', flex: 0, padding: '14px 18px' }}
              >
                Delete
              </button>
            </div>
          )}

          {/* Action buttons - Region tab */}
          {!actionType && !isUnassignedTab && (
            <div style={styles.actionRow}>
              <button
                onClick={handleUnassign}
                disabled={saving}
                style={{
                  ...styles.actionBtn,
                  backgroundColor: '#64748b',
                  opacity: saving ? 0.6 : 1,
                  flex: 1,
                }}
              >
                {saving ? 'Removing...' : `Unassign ${selectedIds.length.toLocaleString()}`}
              </button>
              {regions.length > 1 && (
                <button
                  onClick={() => setActionType('reassign')}
                  style={{ ...styles.actionBtn, backgroundColor: '#1e3a8a', flex: 1 }}
                >
                  Reassign
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ ...styles.actionBtn, backgroundColor: '#dc2626', flex: 0, padding: '14px 18px' }}
              >
                Delete
              </button>
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
    paddingBottom: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    flex: 1,
  },
  regionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  regionLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  pillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  pill: {
    padding: '7px 14px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pillActive: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: '1px solid #1e3a8a',
  },
  createRegionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '7px 14px',
    borderRadius: '20px',
    border: '1px dashed #93c5fd',
    backgroundColor: '#eff6ff',
    color: '#1e3a8a',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  createRegionCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  createRegionInput: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
  },
  createRegionActions: {
    display: 'flex',
    gap: '8px',
  },
  createRegionSaveBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  createRegionCancelBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  pickerWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  pickerLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  pickerPillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  pickerPill: {
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  pickerPillActive: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: '1px solid #1e3a8a',
  },
  pickerActions: {
    display: 'flex',
    gap: '8px',
  },
  cancelBtn: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    maxWidth: '400px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  modalText: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5',
    margin: 0,
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  // Filter styles
  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
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
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
    backgroundColor: '#f8fafc',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
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
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
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
  filterResultText: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
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

export default RegionAccountAssigner;
