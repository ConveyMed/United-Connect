import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER, getUserName } from './hierarchyConstants';

const useHierarchyData = () => {
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id || null;
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountCountByUser, setAccountCountByUser] = useState({});
  const [regionAccountCounts, setRegionAccountCounts] = useState({});

  // Detail popup stack
  const [detailStack, setDetailStack] = useState([]);

  // Drag confirm modal
  const [dragConfirm, setDragConfirm] = useState(null);

  // Generic confirm modal
  const [confirmModal, setConfirmModal] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Data fetching
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [usersRes, assignmentsRes, regionsRes, delegationsRes, surgeonRegionsRes] = await Promise.all([
      supabase.from('users').select('id, first_name, last_name, email').order('first_name'),
      supabase.from('hierarchy_assignments').select('*'),
      supabase.from('regions').select('*').order('name'),
      supabase.from('account_delegations').select('user_id'),
      supabase.from('surgeon_regions').select('region_id'),
    ]);
    if (usersRes.data) setUsers(usersRes.data);
    if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    if (regionsRes.data) setRegions(regionsRes.data);
    // Build account count map
    const countMap = {};
    (delegationsRes.data || []).forEach(d => {
      countMap[d.user_id] = (countMap[d.user_id] || 0) + 1;
    });
    setAccountCountByUser(countMap);
    // Build region account count map
    const regionCountMap = {};
    (surgeonRegionsRes.data || []).forEach(sr => {
      regionCountMap[sr.region_id] = (regionCountMap[sr.region_id] || 0) + 1;
    });
    setRegionAccountCounts(regionCountMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Detail popup navigation
  const openDetail = (userId) => setDetailStack([userId]);
  const pushDetail = (userId) => setDetailStack(prev => [...prev, userId]);
  const popDetail = () => setDetailStack(prev => prev.slice(0, -1));
  const closeDetail = () => setDetailStack([]);
  const currentDetailUserId = detailStack.length > 0 ? detailStack[detailStack.length - 1] : null;

  // Computed maps
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });

  const assignmentsByUser = {};
  assignments.forEach(a => {
    if (!assignmentsByUser[a.user_id]) assignmentsByUser[a.user_id] = [];
    assignmentsByUser[a.user_id].push(a);
  });

  const vpMap = new Map();
  const managerMap = new Map();
  const repMap = new Map();

  Object.entries(assignmentsByUser).forEach(([userId, assigns]) => {
    const role = assigns[0].role_tier;
    if (role === 'vp') vpMap.set(userId, assigns);
    else if (role === 'manager') managerMap.set(userId, assigns);
    else if (role === 'rep') repMap.set(userId, assigns);
  });

  // Unassigned
  const assignedUserIds = new Set(assignments.map(a => a.user_id));
  const unassignedUsers = users.filter(u => !assignedUserIds.has(u.id));

  const assignedRegionIds = new Set();
  assignments.filter(a => a.role_tier === 'vp' && a.region_id).forEach(a => assignedRegionIds.add(a.region_id));
  const unassignedRegions = regions.filter(r => !assignedRegionIds.has(r.id));

  // VP and Manager lists for parent pickers
  const vpUsers = assignments
    .filter(a => a.role_tier === 'vp')
    .reduce((acc, a) => {
      if (!acc.find(x => x.userId === a.user_id)) {
        acc.push({ userId: a.user_id, user: users.find(u => u.id === a.user_id) });
      }
      return acc;
    }, []);

  const managerUsers = assignments
    .filter(a => a.role_tier === 'manager')
    .reduce((acc, a) => {
      if (!acc.find(x => x.userId === a.user_id)) {
        acc.push({ userId: a.user_id, user: users.find(u => u.id === a.user_id) });
      }
      return acc;
    }, []);

  // CRUD operations
  const executeRoleChange = async (userId, newRole, keepSubordinates) => {
    setDragConfirm(null);
    const userAssigns = assignments.filter(a => a.user_id === userId);
    const oldLabel = userAssigns[0]?.custom_label || null;

    const { error: delError } = await supabase
      .from('hierarchy_assignments')
      .delete()
      .eq('user_id', userId);

    if (delError) {
      showToast('Failed to update role: ' + delError.message, 'error');
      return;
    }

    let rows;
    if (newRole === 'vp') {
      rows = [{ user_id: userId, role_tier: 'vp', region_id: null, parent_user_id: null, custom_label: oldLabel }];
    } else if (newRole === 'manager') {
      const oldParent = userAssigns[0]?.parent_user_id;
      const parentIsVpOrManager = assignments.some(a => a.user_id === oldParent && (a.role_tier === 'vp' || a.role_tier === 'manager'));
      rows = [{
        user_id: userId,
        role_tier: 'manager',
        region_id: null,
        parent_user_id: parentIsVpOrManager ? oldParent : null,
        custom_label: oldLabel,
      }];
    } else {
      const oldParent = userAssigns[0]?.parent_user_id;
      rows = [{
        user_id: userId,
        role_tier: 'rep',
        region_id: null,
        parent_user_id: oldParent || null,
        custom_label: oldLabel,
      }];
    }

    const { error: insertError } = await supabase
      .from('hierarchy_assignments')
      .insert(rows);

    if (insertError) {
      showToast('Failed to insert new role: ' + insertError.message, 'error');
      fetchData();
      return;
    }

    if (!keepSubordinates) {
      await supabase
        .from('hierarchy_assignments')
        .update({ parent_user_id: null })
        .eq('parent_user_id', userId);
    }

    showToast(`Role changed to ${ROLE_LABELS[newRole]}`);
    fetchData();
  };

  // Walk up hierarchy to find VP for a given user
  const findVpForUser = (userId) => {
    let current = userId;
    const visited = new Set();
    while (current && !visited.has(current)) {
      visited.add(current);
      const assigns = assignments.filter(a => a.user_id === current);
      if (!assigns.length) return null;
      if (assigns[0].role_tier === 'vp') return current;
      current = assigns[0].parent_user_id;
    }
    return null;
  };

  const executeParentChange = async (dragData, dropData) => {
    // Warn if person has accounts and is moving to a different VP's tree
    const acctCount = accountCountByUser[dragData.userId] || 0;
    if (acctCount > 0) {
      const oldVp = findVpForUser(dragData.userId);
      const newVp = dropData.role === 'vp' ? dropData.userId : findVpForUser(dropData.userId);
      if (oldVp && newVp && oldVp !== newVp) {
        const personName = getUserName(userMap[dragData.userId]);
        const oldVpName = getUserName(userMap[oldVp]);
        const doMove = async () => {
          const { error } = await supabase
            .from('hierarchy_assignments')
            .update({ parent_user_id: dropData.userId })
            .eq('id', dragData.assignmentId);
          if (error) {
            showToast('Failed to reassign: ' + error.message, 'error');
            return;
          }
          showToast('Reassigned successfully');
          fetchData();
        };
        setConfirmModal({
          title: 'Moving Between VPs',
          message: `${personName} has ${acctCount} assigned account${acctCount === 1 ? '' : 's'} under VP ${oldVpName}.`,
          subtitle: 'What would you like to do with the accounts?',
          confirmLabel: `Allow ${personName} to take accounts with them`,
          confirmColor: '#1e3a8a',
          onConfirm: async () => {
            setConfirmModal(null);
            await doMove();
          },
          secondLabel: `Only move ${personName} and leave accounts with VP ${oldVpName}`,
          secondColor: '#dc2626',
          onSecond: async () => {
            setConfirmModal(null);
            await supabase.from('account_delegations').delete().eq('user_id', dragData.userId);
            await doMove();
          },
        });
        return;
      }
    }

    const { error } = await supabase
      .from('hierarchy_assignments')
      .update({ parent_user_id: dropData.userId })
      .eq('id', dragData.assignmentId);

    if (error) {
      showToast('Failed to reassign: ' + error.message, 'error');
      return;
    }

    showToast('Reassigned successfully');
    fetchData();
  };

  const executeAssignUnassigned = async (userId, role, parentUserId) => {
    const { error } = await supabase
      .from('hierarchy_assignments')
      .insert({
        user_id: userId,
        role_tier: role,
        parent_user_id: parentUserId,
        region_id: null,
        custom_label: null,
      });

    if (error) {
      showToast('Failed to assign: ' + error.message, 'error');
      return;
    }

    showToast(`Assigned as ${ROLE_LABELS[role]}`);
    fetchData();
  };

  const executeUnassign = async (userId) => {
    const subordinates = assignments.filter(a => a.parent_user_id === userId);
    const subCount = [...new Set(subordinates.map(a => a.user_id))].length;
    const acctCount = accountCountByUser[userId] || 0;

    if (subCount > 0 || acctCount > 0) {
      const parts = [];
      if (acctCount > 0) parts.push(`${acctCount} assigned account${acctCount === 1 ? '' : 's'} (will return to unassigned pool)`);
      if (subCount > 0) parts.push(`${subCount} ${subCount === 1 ? 'person' : 'people'} reporting to them (will become unassigned)`);
      setConfirmModal({
        title: 'Unassign from Hierarchy',
        message: `This person has ${parts.join(' and ')}.`,
        confirmLabel: 'Unassign',
        confirmColor: '#dc2626',
        onConfirm: async () => {
          setConfirmModal(null);
          if (subCount > 0) {
            await supabase
              .from('hierarchy_assignments')
              .update({ parent_user_id: null })
              .eq('parent_user_id', userId);
          }
          const { error } = await supabase.from('hierarchy_assignments').delete().eq('user_id', userId);
          if (error) {
            showToast('Failed to unassign: ' + error.message, 'error');
            return;
          }
          await supabase.from('account_delegations').delete().eq('user_id', userId);
          showToast('Unassigned from hierarchy');
          fetchData();
        },
      });
      return;
    }

    const { error } = await supabase.from('hierarchy_assignments').delete().eq('user_id', userId);
    if (error) {
      showToast('Failed to unassign: ' + error.message, 'error');
      return;
    }
    await supabase.from('account_delegations').delete().eq('user_id', userId);
    showToast('Unassigned from hierarchy');
    fetchData();
  };

  const executeAssignRegion = async (regionId, vpUserId) => {
    const vpAssigns = assignments.filter(a => a.user_id === vpUserId && a.role_tier === 'vp');
    const existingRegionIds = new Set(vpAssigns.filter(a => a.region_id).map(a => a.region_id));

    if (existingRegionIds.has(regionId)) {
      showToast('Region already assigned to this VP', 'error');
      return;
    }

    const noRegionRow = vpAssigns.find(a => !a.region_id);
    if (noRegionRow) {
      const { error } = await supabase.from('hierarchy_assignments')
        .update({ region_id: regionId })
        .eq('id', noRegionRow.id);
      if (error) {
        showToast('Failed to assign region: ' + error.message, 'error');
        return;
      }
    } else {
      const { error } = await supabase.from('hierarchy_assignments').insert({
        user_id: vpUserId,
        role_tier: 'vp',
        region_id: regionId,
        parent_user_id: null,
        custom_label: vpAssigns[0]?.custom_label || null,
      });
      if (error) {
        showToast('Failed to assign region: ' + error.message, 'error');
        return;
      }
    }

    const region = regions.find(r => r.id === regionId);
    showToast(`Assigned ${region?.name || 'region'} to VP`);
    fetchData();
  };

  const handleDetailSave = async (userId, { role, label, parentIds, regionIds }) => {
    await supabase.from('hierarchy_assignments').delete().eq('user_id', userId);

    let rows;
    if (role === 'vp') {
      rows = regionIds.length > 0
        ? regionIds.map(regionId => ({
            user_id: userId, role_tier: 'vp', region_id: regionId,
            parent_user_id: null, custom_label: label,
          }))
        : [{ user_id: userId, role_tier: 'vp', region_id: null, parent_user_id: null, custom_label: label }];
    } else if (role === 'manager') {
      rows = parentIds.length > 0
        ? parentIds.map(parentId => ({
            user_id: userId, role_tier: 'manager', region_id: null,
            parent_user_id: parentId, custom_label: label,
          }))
        : [{ user_id: userId, role_tier: 'manager', region_id: null, parent_user_id: null, custom_label: label }];
    } else {
      rows = parentIds.length > 0
        ? parentIds.map(parentId => ({
            user_id: userId, role_tier: 'rep', region_id: null,
            parent_user_id: parentId, custom_label: label,
          }))
        : [{ user_id: userId, role_tier: 'rep', region_id: null, parent_user_id: null, custom_label: label }];
    }

    const { error } = await supabase.from('hierarchy_assignments').insert(rows);
    if (error) {
      showToast('Failed to save: ' + error.message, 'error');
    } else {
      showToast('Saved');
      closeDetail();
    }
    fetchData();
  };

  const handleDetailRemove = async (userId) => {
    const subordinates = assignments.filter(a => a.parent_user_id === userId);
    const subCount = [...new Set(subordinates.map(a => a.user_id))].length;
    const acctCount = accountCountByUser[userId] || 0;

    if (subCount > 0 || acctCount > 0) {
      const parts = [];
      if (acctCount > 0) parts.push(`${acctCount} assigned account${acctCount === 1 ? '' : 's'} (will return to unassigned pool)`);
      if (subCount > 0) parts.push(`${subCount} ${subCount === 1 ? 'person' : 'people'} reporting to them (will become unassigned)`);
      setConfirmModal({
        title: 'Remove from Hierarchy',
        message: `This person has ${parts.join(' and ')}.`,
        confirmLabel: 'Remove',
        confirmColor: '#dc2626',
        onConfirm: async () => {
          setConfirmModal(null);
          if (subCount > 0) {
            await supabase.from('hierarchy_assignments').update({ parent_user_id: null }).eq('parent_user_id', userId);
          }
          await supabase.from('hierarchy_assignments').delete().eq('user_id', userId);
          await supabase.from('account_delegations').delete().eq('user_id', userId);
          closeDetail();
          showToast('Unassigned from hierarchy');
          fetchData();
        },
      });
      return;
    }

    await supabase.from('hierarchy_assignments').delete().eq('user_id', userId);
    await supabase.from('account_delegations').delete().eq('user_id', userId);
    closeDetail();
    showToast('Unassigned from hierarchy');
    fetchData();
  };

  const requestRoleChange = (userId, newRole) => {
    const subordinates = assignments.filter(a => a.parent_user_id === userId);
    if (subordinates.length > 0) {
      closeDetail();
      setDragConfirm({
        userId,
        personName: getUserName(users.find(u => u.id === userId)),
        fromRole: assignmentsByUser[userId]?.[0]?.role_tier,
        toRole: newRole,
        subordinateCount: [...new Set(subordinates.map(a => a.user_id))].length,
        onKeep: () => executeRoleChange(userId, newRole, true),
        onRemove: () => executeRoleChange(userId, newRole, false),
      });
    } else {
      closeDetail();
      executeRoleChange(userId, newRole, true);
    }
  };

  return {
    // Raw data
    users, assignments, regions, loading,

    // Computed
    vpMap, managerMap, repMap,
    userMap,
    assignmentsByUser,
    unassignedUsers, unassignedRegions,
    vpUsers, managerUsers,
    accountCountByUser,
    regionAccountCounts,

    // CRUD
    executeRoleChange,
    executeParentChange,
    executeAssignUnassigned,
    executeUnassign,
    executeAssignRegion,
    handleDetailSave,
    handleDetailRemove,
    requestRoleChange,

    // Detail popup
    detailStack, currentDetailUserId,
    openDetail, pushDetail, popDetail, closeDetail,

    // Drag confirm modal
    dragConfirm, setDragConfirm,

    // Generic confirm modal
    confirmModal, setConfirmModal,

    // Toast
    toast, showToast,

    // Manual refresh
    fetchData,

    // Current user
    currentUserId,
  };
};

export default useHierarchyData;
