import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import useHierarchyData from './useHierarchyData';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER, getUserName } from './hierarchyConstants';
import PersonDetailPopup from './PersonDetailPopup';
import DragConfirmModal from './DragConfirmModal';
import ConfirmModal from './ConfirmModal';
import HierarchyToast from './HierarchyToast';

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const MeBadge = () => (
  <span style={{ fontSize: '10px', fontWeight: '700', color: '#0d9488', backgroundColor: '#ccfbf1', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>Me</span>
);

// ─── Draggable + Droppable org chart box ────────────────────────────────────
const OrgBox = ({ userId, user, role, subtitle, regionChips, assignmentId, onTap, isMe, accountCount, regionAccountCounts }) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `orgchart-drop-${role}-${userId}`,
    data: { role, userId },
  });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `orgchart-drag-${role}-${userId}`,
    data: { userId, user, role, assignmentId, dragId: `orgchart-drag-${role}-${userId}` },
  });

  const combinedRef = (el) => {
    setDropRef(el);
    setDragRef(el);
  };

  const color = ROLE_COLORS[role] || '#94a3b8';
  const widths = { vp: 180, manager: 160, rep: 140 };
  const width = widths[role] || 150;

  return (
    <div
      ref={combinedRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onTap(userId);
        }
      }}
      style={{
        width: `${width}px`,
        backgroundColor: isOver ? '#f0f9ff' : '#ffffff',
        borderRadius: '8px',
        borderTop: isOver ? `2px solid ${color}` : '1px solid #e2e8f0',
        borderRight: isOver ? `2px solid ${color}` : '1px solid #e2e8f0',
        borderBottom: isOver ? `2px solid ${color}` : '1px solid #e2e8f0',
        borderLeft: `4px solid ${color}`,
        padding: '12px',
        cursor: 'grab',
        touchAction: 'none',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        opacity: isDragging ? 0.3 : 1,
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#1e293b',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {getUserName(user)}
        </span>
        {isMe && <MeBadge />}
        <span style={{
          fontSize: '10px',
          fontWeight: '700',
          color: '#ffffff',
          backgroundColor: color,
          padding: '2px 6px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          flexShrink: 0,
        }}>
          {ROLE_LABELS[role]}
        </span>
      </div>
      {subtitle && (
        <span style={{
          fontSize: '11px',
          color: '#94a3b8',
          fontStyle: 'italic',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </span>
      )}
      {regionChips && regionChips.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginTop: '4px',
        }}>
          {regionChips.map((r) => (
            <span key={r.id} style={{
              fontSize: '10px',
              fontWeight: '600',
              color: '#1e3a8a',
              backgroundColor: '#dbeafe',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              {r.name}{regionAccountCounts?.[r.id] ? ` ${regionAccountCounts[r.id].toLocaleString()}` : ''}
            </span>
          ))}
        </div>
      )}
      {accountCount > 0 && (
        <span style={{
          fontSize: '11px',
          color: '#64748b',
          fontWeight: '500',
          marginTop: '2px',
        }}>
          {accountCount} account{accountCount === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
};

// ─── Draggable card for unassigned users ─────────────────────────────────────
const UnassignedUserCard = ({ user, onTap, isMe }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `orgchart-unassigned-user-${user.id}`,
    data: {
      userId: user.id,
      user,
      isUnassigned: true,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging && onTap) {
          e.stopPropagation();
          onTap(user.id);
        }
      }}
      style={{
        ...styles.unassignedCard,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#94a3b8',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: '13px',
        fontWeight: '600',
        color: '#1e293b',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {getUserName(user)}
      </span>
      {isMe && <MeBadge />}
    </div>
  );
};

// ─── Draggable chip for unassigned regions ───────────────────────────────────
const DraggableRegionChip = ({ region }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `orgchart-region-${region.id}`,
    data: {
      isUnassignedRegion: true,
      regionId: region.id,
      region,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        fontSize: '11px',
        fontWeight: '600',
        color: '#1e3a8a',
        backgroundColor: '#dbeafe',
        padding: '4px 8px',
        borderRadius: '6px',
        cursor: 'grab',
        touchAction: 'none',
        border: '1px solid #bfdbfe',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {region.name}
    </div>
  );
};

// ─── Connector line helpers ──────────────────────────────────────────────────
const VerticalLine = ({ height }) => (
  <div style={{
    width: '2px',
    height: `${height}px`,
    backgroundColor: '#cbd5e1',
    margin: '0 auto',
    flexShrink: 0,
  }} />
);

// Container that draws a horizontal bar across children, connecting their centers
const ConnectedChildrenRow = ({ children, gap = 16 }) => (
  <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', gap: `${gap}px` }}>
    <div style={{
      position: 'absolute',
      top: 0,
      left: '50%',
      right: '50%',
      height: '2px',
      backgroundColor: '#cbd5e1',
    }} ref={(el) => {
      if (!el || !el.parentElement) return;
      const parent = el.parentElement;
      const kids = Array.from(parent.children).filter(c => c !== el);
      if (kids.length < 2) { el.style.display = 'none'; return; }
      const parentRect = parent.getBoundingClientRect();
      const firstRect = kids[0].getBoundingClientRect();
      const lastRect = kids[kids.length - 1].getBoundingClientRect();
      const left = firstRect.left + firstRect.width / 2 - parentRect.left;
      const right = lastRect.left + lastRect.width / 2 - parentRect.left;
      el.style.left = `${left}px`;
      el.style.right = `${parentRect.width - right}px`;
      el.style.display = 'block';
    }} />
    {children}
  </div>
);

// ─── VP picker modal (for clicking unassigned regions) ───────────────────────
const VpPickerModal = ({ vpUsers, userMap, onSelect, onCancel }) => (
  <div style={styles.pickerOverlay} onClick={onCancel}>
    <div style={styles.pickerModal} onClick={(e) => e.stopPropagation()}>
      <h3 style={styles.pickerTitle}>Assign to VP</h3>
      <p style={styles.pickerDesc}>Select a VP to assign this region to.</p>
      <div style={styles.pickerList}>
        {vpUsers.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>No VPs available</span>
          </div>
        ) : (
          vpUsers.map((vp) => (
            <button
              key={vp.userId}
              onClick={() => onSelect(vp.userId)}
              style={styles.pickerRow}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: ROLE_COLORS.vp,
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1e293b',
                flex: 1,
              }}>
                {getUserName(vp.user)}
              </span>
            </button>
          ))
        )}
      </div>
      <button onClick={onCancel} style={styles.pickerCancelBtn}>Cancel</button>
    </div>
  </div>
);

// ─── Subtree renderers ───────────────────────────────────────────────────────
const RepSubtree = ({ userId, user, parentName, assignmentId, onTap, currentUserId, accountCount }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }}>
    <VerticalLine height={24} />
    <OrgBox
      userId={userId}
      user={user}
      role="rep"
      subtitle={parentName ? `Reports to: ${parentName}` : null}
      regionChips={[]}
      assignmentId={assignmentId}
      onTap={onTap}
      isMe={userId === currentUserId}
      accountCount={accountCount}
    />
  </div>
);

const ManagerSubtree = ({
  userId,
  user,
  parentName,
  assignmentId,
  repChildren,
  subManagerChildren = [],
  userMap,
  assignments,
  managerMap,
  repMap,
  onTap,
  currentUserId,
  accountCountByUser,
}) => {
  // Build sub-manager children if not provided but we have the data to find them
  let resolvedSubManagers = subManagerChildren;
  if (resolvedSubManagers.length === 0 && managerMap && assignments) {
    const subMgrs = [];
    const seen = new Set();
    for (const [mgrId] of managerMap) {
      if (seen.has(mgrId) || mgrId === userId) continue;
      const mgrAssigns = assignments.filter(
        (a) => a.user_id === mgrId && a.role_tier === 'manager'
      );
      if (mgrAssigns.some((a) => a.parent_user_id === userId)) {
        seen.add(mgrId);
        const mgrUser = userMap[mgrId];
        const mgrAssignId = mgrAssigns.find(a => a.parent_user_id === userId)?.id;
        if (mgrUser) {
          // Find reps under this sub-manager
          const reps = [];
          const repSeen = new Set();
          if (repMap) {
            for (const [repUserId] of repMap) {
              if (repSeen.has(repUserId)) continue;
              const repAssigns = assignments.filter(
                (a) => a.user_id === repUserId && a.role_tier === 'rep'
              );
              if (repAssigns.some((a) => a.parent_user_id === mgrId)) {
                repSeen.add(repUserId);
                const repUser = userMap[repUserId];
                const repAssignId = repAssigns.find(a => a.parent_user_id === mgrId)?.id;
                if (repUser) {
                  reps.push({ userId: repUserId, user: repUser, assignmentId: repAssignId });
                }
              }
            }
          }
          subMgrs.push({ userId: mgrId, user: mgrUser, assignmentId: mgrAssignId, repChildren: reps });
        }
      }
    }
    resolvedSubManagers = subMgrs;
  }

  const allChildren = [
    ...resolvedSubManagers.map(mgr => ({ ...mgr, type: 'manager' })),
    ...repChildren.map(rep => ({ ...rep, type: 'rep' })),
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <VerticalLine height={24} />
      <OrgBox
        userId={userId}
        user={user}
        role="manager"
        subtitle={parentName ? `Reports to: ${parentName}` : null}
        regionChips={[]}
        assignmentId={assignmentId}
        onTap={onTap}
        isMe={userId === currentUserId}
        accountCount={accountCountByUser ? (accountCountByUser[userId] || 0) : 0}
      />
      {allChildren.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <VerticalLine height={24} />
          <ConnectedChildrenRow gap={16}>
            {allChildren.map((child) => (
              child.type === 'manager' ? (
                <ManagerSubtree
                  key={child.userId}
                  userId={child.userId}
                  user={child.user}
                  assignmentId={child.assignmentId}
                  parentName={getUserName(user)}
                  repChildren={child.repChildren || []}
                  userMap={userMap}
                  assignments={assignments}
                  managerMap={managerMap}
                  repMap={repMap}
                  onTap={onTap}
                  currentUserId={currentUserId}
                  accountCountByUser={accountCountByUser}
                />
              ) : (
                <RepSubtree
                  key={child.userId}
                  userId={child.userId}
                  user={child.user}
                  parentName={getUserName(user)}
                  assignmentId={child.assignmentId}
                  onTap={onTap}
                  currentUserId={currentUserId}
                  accountCount={accountCountByUser ? (accountCountByUser[child.userId] || 0) : 0}
                />
              )
            ))}
          </ConnectedChildrenRow>
        </div>
      )}
    </div>
  );
};

const VpSubtree = ({
  userId,
  user,
  assignmentId,
  regionChips,
  managerChildren,
  repChildren = [],
  userMap,
  assignments,
  managerMap,
  repMap,
  onTap,
  currentUserId,
  accountCountByUser,
}) => {
  const allChildren = [
    ...managerChildren.map(mgr => ({ ...mgr, type: 'manager' })),
    ...repChildren.map(rep => ({ ...rep, type: 'rep' })),
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <OrgBox
        userId={userId}
        user={user}
        role="vp"
        subtitle={null}
        regionChips={regionChips}
        assignmentId={assignmentId}
        onTap={onTap}
        isMe={userId === currentUserId}
        accountCount={accountCountByUser ? (accountCountByUser[userId] || 0) : 0}
      />
      {allChildren.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <VerticalLine height={24} />
          <ConnectedChildrenRow gap={16}>
            {allChildren.map((child) => {
              if (child.type === 'rep') {
                return (
                  <RepSubtree
                    key={child.userId}
                    userId={child.userId}
                    user={child.user}
                    parentName={getUserName(user)}
                    assignmentId={child.assignmentId}
                    onTap={onTap}
                    currentUserId={currentUserId}
                    accountCount={accountCountByUser ? (accountCountByUser[child.userId] || 0) : 0}
                  />
                );
              }

              // Manager child - find reps under this manager
              const reps = [];
              const repSeen = new Set();
              for (const [repUserId] of repMap) {
                if (repSeen.has(repUserId)) continue;
                const repAssigns = assignments.filter(
                  (a) => a.user_id === repUserId && a.role_tier === 'rep'
                );
                const reportsToMgr = repAssigns.some(
                  (a) => a.parent_user_id === child.userId
                );
                if (reportsToMgr) {
                  repSeen.add(repUserId);
                  const repUser = userMap[repUserId];
                  const repAssignId = repAssigns.find(a => a.parent_user_id === child.userId)?.id;
                  if (repUser) {
                    reps.push({ userId: repUserId, user: repUser, assignmentId: repAssignId });
                  }
                }
              }

              return (
                <ManagerSubtree
                  key={child.userId}
                  userId={child.userId}
                  user={child.user}
                  assignmentId={child.assignmentId}
                  parentName={getUserName(user)}
                  repChildren={reps}
                  userMap={userMap}
                  assignments={assignments}
                  managerMap={managerMap}
                  repMap={repMap}
                  onTap={onTap}
                  currentUserId={currentUserId}
                  accountCountByUser={accountCountByUser}
                />
              );
            })}
          </ConnectedChildrenRow>
        </div>
      )}
    </div>
  );
};

// ─── Droppable VP zone (blank chart area) ───────────────────────────────────
const DroppableVpZone = ({ children, isActive }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'orgchart-vp-zone',
    data: { type: 'vp-zone' },
  });
  return (
    <div ref={setNodeRef} style={{
      ...styles.chartScroller,
      ...(isOver && isActive ? { outline: '2px dashed #7c3aed', outlineOffset: '-2px', backgroundColor: '#faf5ff' } : {}),
    }}>
      {children}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
const HierarchyOrgChart = () => {
  const navigate = useNavigate();
  const data = useHierarchyData();
  const {
    users, assignments, regions, loading,
    vpMap, managerMap, repMap, userMap, assignmentsByUser,
    unassignedUsers, unassignedRegions,
    vpUsers,
    executeParentChange, executeAssignUnassigned, executeAssignRegion,
    requestRoleChange, handleDetailSave, handleDetailRemove,
    detailStack, currentDetailUserId, openDetail, pushDetail, popDetail, closeDetail,
    dragConfirm, setDragConfirm,
    confirmModal, setConfirmModal,
    toast,
    currentUserId,
  } = data;

  const [activeDragData, setActiveDragData] = useState(null);
  const [regionPickerData, setRegionPickerData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const matchesSearch = (user) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = getUserName(user).toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  };

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Build VP subtree data
  const vpSubtrees = [];
  const vpSeen = new Set();
  for (const [vpUserId] of vpMap) {
    if (vpSeen.has(vpUserId)) continue;
    vpSeen.add(vpUserId);
    const vpUser = userMap[vpUserId];
    if (!vpUser) continue;

    const vpAssigns = assignmentsByUser[vpUserId] || [];
    const regionIds = vpAssigns.filter((a) => a.region_id).map((a) => a.region_id);
    const vpRegions = regionIds
      .map((id) => regions.find((r) => r.id === id))
      .filter(Boolean);

    // Find managers under this VP
    const managers = [];
    const mgrSeen = new Set();
    for (const [mgrUserId] of managerMap) {
      if (mgrSeen.has(mgrUserId)) continue;
      const mgrAssigns = assignments.filter(
        (a) => a.user_id === mgrUserId && a.role_tier === 'manager'
      );
      const reportsToVp = mgrAssigns.some(
        (a) => a.parent_user_id === vpUserId
      );
      if (reportsToVp) {
        mgrSeen.add(mgrUserId);
        const mgrUser = userMap[mgrUserId];
        const mgrAssignId = mgrAssigns.find(a => a.parent_user_id === vpUserId)?.id;
        if (mgrUser) {
          managers.push({ userId: mgrUserId, user: mgrUser, assignmentId: mgrAssignId });
        }
      }
    }

    // Find reps directly under this VP
    const directReps = [];
    const directRepSeen = new Set();
    for (const [repUserId] of repMap) {
      if (directRepSeen.has(repUserId)) continue;
      const repAssigns = assignments.filter(
        (a) => a.user_id === repUserId && a.role_tier === 'rep'
      );
      if (repAssigns.some((a) => a.parent_user_id === vpUserId)) {
        directRepSeen.add(repUserId);
        const repUser = userMap[repUserId];
        const repAssignId = repAssigns.find(a => a.parent_user_id === vpUserId)?.id;
        if (repUser) {
          directReps.push({ userId: repUserId, user: repUser, assignmentId: repAssignId });
        }
      }
    }

    vpSubtrees.push({
      userId: vpUserId,
      user: vpUser,
      assignmentId: vpAssigns[0]?.id,
      regionChips: vpRegions,
      managerChildren: managers,
      repChildren: directReps,
    });
  }

  vpSubtrees.sort((a, b) => {
    const aName = (a.user?.first_name || '').toLowerCase();
    const bName = (b.user?.first_name || '').toLowerCase();
    return aName.localeCompare(bName);
  });

  // Orphan managers (no VP or manager parent -- truly unlinked)
  const orphanManagers = [];
  const orphanMgrSeen = new Set();
  for (const [mgrUserId] of managerMap) {
    if (orphanMgrSeen.has(mgrUserId)) continue;
    const mgrAssigns = assignments.filter(
      (a) => a.user_id === mgrUserId && a.role_tier === 'manager'
    );
    const hasParentInTree = mgrAssigns.some((a) => {
      if (!a.parent_user_id) return false;
      return vpMap.has(a.parent_user_id) || managerMap.has(a.parent_user_id);
    });
    if (!hasParentInTree) {
      orphanMgrSeen.add(mgrUserId);
      const mgrUser = userMap[mgrUserId];
      if (mgrUser) {
        // Find reps under this manager
        const reps = [];
        const repSeen = new Set();
        for (const [repUserId] of repMap) {
          if (repSeen.has(repUserId)) continue;
          const repAssigns = assignments.filter(
            (a) => a.user_id === repUserId && a.role_tier === 'rep'
          );
          const reportsToMgr = repAssigns.some(
            (a) => a.parent_user_id === mgrUserId
          );
          if (reportsToMgr) {
            repSeen.add(repUserId);
            const repUser = userMap[repUserId];
            const repAssignId = repAssigns.find(a => a.parent_user_id === mgrUserId)?.id;
            if (repUser) {
              reps.push({ userId: repUserId, user: repUser, assignmentId: repAssignId });
            }
          }
        }
        orphanManagers.push({
          userId: mgrUserId,
          user: mgrUser,
          assignmentId: mgrAssigns[0]?.id,
          repChildren: reps,
        });
      }
    }
  }

  // Orphan reps (no manager parent)
  const orphanReps = [];
  const orphanRepSeen = new Set();
  for (const [repUserId] of repMap) {
    if (orphanRepSeen.has(repUserId)) continue;
    const repAssigns = assignments.filter(
      (a) => a.user_id === repUserId && a.role_tier === 'rep'
    );
    const hasMgrParent = repAssigns.some((a) => {
      if (!a.parent_user_id) return false;
      return managerMap.has(a.parent_user_id) || vpMap.has(a.parent_user_id);
    });
    if (!hasMgrParent) {
      orphanRepSeen.add(repUserId);
      const repUser = userMap[repUserId];
      if (repUser) {
        orphanReps.push({ userId: repUserId, user: repUser, assignmentId: repAssigns[0]?.id });
      }
    }
  }

  // Search filtering
  const subtreeContainsMatch = (vp) => {
    if (matchesSearch(vp.user)) return true;
    if (vp.repChildren && vp.repChildren.some(rep => matchesSearch(rep.user))) return true;
    return vp.managerChildren.some(mgr => {
      if (matchesSearch(mgr.user)) return true;
      for (const [repUserId] of repMap) {
        const repAssigns = assignments.filter(a => a.user_id === repUserId && a.role_tier === 'rep');
        if (repAssigns.some(a => a.parent_user_id === mgr.userId)) {
          const repUser = userMap[repUserId];
          if (repUser && matchesSearch(repUser)) return true;
        }
      }
      return false;
    });
  };

  const filteredVpSubtrees = searchQuery.trim() ? vpSubtrees.filter(subtreeContainsMatch) : vpSubtrees;
  const filteredOrphanManagers = searchQuery.trim()
    ? orphanManagers.filter(mgr => matchesSearch(mgr.user) || mgr.repChildren.some(r => matchesSearch(r.user)))
    : orphanManagers;
  const filteredOrphanReps = searchQuery.trim() ? orphanReps.filter(r => matchesSearch(r.user)) : orphanReps;
  const filteredUnassignedUsers = searchQuery.trim() ? unassignedUsers.filter(matchesSearch) : unassignedUsers;

  const handleDragStart = (event) => {
    setActiveDragData(event.active.data.current);
  };

  const handleDragEnd = async (event) => {
    const { over } = event;
    const dragData = activeDragData;
    setActiveDragData(null);

    if (!dragData || !over) return;
    const dropData = over.data.current;
    if (!dropData) return;

    // Region chip dropped onto a VP box
    if (dragData.isUnassignedRegion && dropData.role === 'vp') {
      await executeAssignRegion(dragData.regionId, dropData.userId);
      return;
    }

    // Unassigned user dropped onto a VP box -> assign as manager under that VP
    if (dragData.isUnassigned && dropData.role === 'vp') {
      await executeAssignUnassigned(dragData.userId, 'manager', dropData.userId);
      return;
    }

    // Unassigned user dropped onto a Manager box -> assign as rep under that manager
    if (dragData.isUnassigned && dropData.role === 'manager') {
      await executeAssignUnassigned(dragData.userId, 'rep', dropData.userId);
      return;
    }

    // Unassigned user onto VP zone (blank chart area, not on a specific box)
    if (dragData.isUnassigned && dropData.type === 'vp-zone') {
      await executeAssignUnassigned(dragData.userId, 'vp', null);
      return;
    }

    // Manager with no subordinates onto VP zone -> promote to VP
    if (dragData.role === 'manager' && dropData.type === 'vp-zone') {
      const hasSubs = assignments.some(a => a.parent_user_id === dragData.userId);
      if (!hasSubs) {
        requestRoleChange(dragData.userId, 'vp');
        return;
      }
    }

    // Assigned user reassignment: rep onto manager/VP, manager onto VP or another manager
    if (dragData.role && dropData.role && dragData.userId !== dropData.userId) {
      const dragRole = dragData.role;
      const dropRole = dropData.role;
      if (
        (dragRole === 'rep' && (dropRole === 'manager' || dropRole === 'vp')) ||
        (dragRole === 'manager' && (dropRole === 'vp' || dropRole === 'manager'))
      ) {
        await executeParentChange(dragData, dropData);
      }
    }
  };

  // Handle clicking a region chip in the unassigned section
  const handleRegionClick = (regionId) => {
    setRegionPickerData({ regionId });
  };

  const handleRegionVpSelect = async (vpUserId) => {
    if (!regionPickerData) return;
    await executeAssignRegion(regionPickerData.regionId, vpUserId);
    setRegionPickerData(null);
  };

  // Promote/demote handlers for PersonDetailPopup
  const getPromoteDemoteHandlers = (userId) => {
    const userAssigns = assignmentsByUser[userId];
    if (!userAssigns || userAssigns.length === 0) return {};
    const role = userAssigns[0]?.role_tier;
    const idx = ROLE_ORDER.indexOf(role);
    return {
      onPromote: idx >= 0 && idx < ROLE_ORDER.length - 1
        ? () => requestRoleChange(userId, ROLE_ORDER[idx + 1])
        : undefined,
      onDemote: idx > 0
        ? () => requestRoleChange(userId, ROLE_ORDER[idx - 1])
        : undefined,
    };
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <button onClick={() => navigate('/field-intel')} style={styles.backBtn}>
            <ArrowLeftIcon />
          </button>
          <h2 style={styles.title}>Org Chart</h2>
        </div>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  const hasChart = filteredVpSubtrees.length > 0 || filteredOrphanManagers.length > 0 || filteredOrphanReps.length > 0;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerRow}>
          <button onClick={() => navigate('/field-intel')} style={styles.backBtn}>
            <ArrowLeftIcon />
          </button>
          <h2 style={styles.title}>Org Chart</h2>
        </div>

        <div style={styles.searchWrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            style={styles.searchInput}
          />
        </div>

        {/* Unassigned Regions Pool */}
        <div style={styles.poolSection}>
          <span style={styles.poolTitle}>
            Unassigned Regions ({unassignedRegions.length})
          </span>
          {unassignedRegions.length === 0 ? (
            <span style={styles.poolEmpty}>All regions are assigned</span>
          ) : (
            <div style={styles.poolRow}>
              {unassignedRegions.map((region) => (
                <div key={region.id} onClick={() => handleRegionClick(region.id)}>
                  <DraggableRegionChip region={region} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Org chart area - VP drop zone */}
        <DroppableVpZone isActive={!!activeDragData && (activeDragData.isUnassigned || activeDragData.role === 'manager')}>
          {!hasChart && (
            <div style={styles.emptyState}>
              <span style={styles.emptyText}>No hierarchy data yet. Drag users from the unassigned pool onto boxes to build the org chart.</span>
            </div>
          )}

          {hasChart && (
            <div style={styles.chartInner}>
              {/* VP subtrees */}
              <div style={styles.vpRow}>
                {filteredVpSubtrees.map((vp) => (
                  <VpSubtree
                    key={vp.userId}
                    userId={vp.userId}
                    user={vp.user}
                    assignmentId={vp.assignmentId}
                    regionChips={vp.regionChips}
                    managerChildren={vp.managerChildren}
                    repChildren={vp.repChildren}
                    userMap={userMap}
                    assignments={assignments}
                    managerMap={managerMap}
                    repMap={repMap}
                    onTap={openDetail}
                    currentUserId={currentUserId}
                    accountCountByUser={data.accountCountByUser}
                  />
                ))}
              </div>

              {/* Orphan managers */}
              {filteredOrphanManagers.length > 0 && (
                <div style={styles.orphanSection}>
                  <span style={styles.orphanLabel}>Unlinked Managers</span>
                  <div style={styles.orphanRow}>
                    {filteredOrphanManagers.map((mgr) => (
                      <ManagerSubtree
                        key={mgr.userId}
                        userId={mgr.userId}
                        user={mgr.user}
                        assignmentId={mgr.assignmentId}
                        parentName={null}
                        repChildren={mgr.repChildren}
                        userMap={userMap}
                        assignments={assignments}
                        managerMap={managerMap}
                        repMap={repMap}
                        onTap={openDetail}
                        currentUserId={currentUserId}
                        accountCountByUser={data.accountCountByUser}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Orphan reps */}
              {filteredOrphanReps.length > 0 && (
                <div style={styles.orphanSection}>
                  <span style={styles.orphanLabel}>Unlinked Reps</span>
                  <div style={styles.orphanRow}>
                    {filteredOrphanReps.map((rep) => (
                      <OrgBox
                        key={rep.userId}
                        userId={rep.userId}
                        user={rep.user}
                        role="rep"
                        subtitle={null}
                        regionChips={[]}
                        assignmentId={rep.assignmentId}
                        onTap={openDetail}
                        isMe={rep.userId === currentUserId}
                        accountCount={data.accountCountByUser?.[rep.userId] || 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DroppableVpZone>

        {/* Unassigned Users Pool */}
        <div style={styles.poolSection}>
          <span style={styles.poolTitle}>
            Unassigned Users ({filteredUnassignedUsers.length})
          </span>
          {filteredUnassignedUsers.length === 0 ? (
            <span style={styles.poolEmpty}>{searchQuery.trim() ? 'No matching users' : 'All users are assigned'}</span>
          ) : (
            <div style={styles.poolRow}>
              {filteredUnassignedUsers.map((user) => (
                <UnassignedUserCard key={user.id} user={user} onTap={openDetail} isMe={user.id === currentUserId} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragData && (
          <div style={styles.dragOverlay}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: activeDragData.isUnassignedRegion
                ? '#1e3a8a'
                : (ROLE_COLORS[activeDragData.role] || '#94a3b8'),
              flexShrink: 0,
            }} />
            <span style={styles.dragOverlayName}>
              {activeDragData.isUnassignedRegion
                ? activeDragData.region?.name
                : getUserName(activeDragData.user)}
            </span>
            <span style={{
              ...styles.dragOverlayBadge,
              backgroundColor: activeDragData.isUnassignedRegion
                ? '#1e3a8a'
                : (ROLE_COLORS[activeDragData.role] || '#94a3b8'),
            }}>
              {activeDragData.isUnassignedRegion
                ? 'Region'
                : (ROLE_LABELS[activeDragData.role] || 'Unassigned')}
            </span>
          </div>
        )}
      </DragOverlay>

      {/* VP Picker for region click */}
      {regionPickerData && (
        <VpPickerModal
          vpUsers={vpUsers}
          userMap={userMap}
          onSelect={handleRegionVpSelect}
          onCancel={() => setRegionPickerData(null)}
        />
      )}

      {/* Person Detail Popup */}
      {currentDetailUserId && (() => {
        const handlers = getPromoteDemoteHandlers(currentDetailUserId);
        return (
          <PersonDetailPopup
            userId={currentDetailUserId}
            users={users}
            assignments={assignments}
            regions={regions}
            canGoBack={detailStack.length > 1}
            onBack={popDetail}
            onClose={closeDetail}
            onSave={handleDetailSave}
            onRemove={handleDetailRemove}
            onPromote={handlers.onPromote}
            onDemote={handlers.onDemote}
            onNavigate={pushDetail}
            onAssign={executeAssignUnassigned}
            accountCount={data.accountCountByUser?.[currentDetailUserId] || 0}
          />
        );
      })()}

      {/* Drag Confirm Modal */}
      {dragConfirm && (
        <DragConfirmModal
          personName={dragConfirm.personName}
          fromRole={dragConfirm.fromRole}
          toRole={dragConfirm.toRole}
          subordinateCount={dragConfirm.subordinateCount}
          onKeep={() => { dragConfirm.onKeep(); }}
          onRemove={() => { dragConfirm.onRemove(); }}
          onCancel={() => setDragConfirm(null)}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
            subtitle={confirmModal.subtitle}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          onConfirm={confirmModal.onConfirm}
          secondLabel={confirmModal.secondLabel}
          secondColor={confirmModal.secondColor}
          onSecond={confirmModal.onSecond}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Toast */}
      <HierarchyToast toast={toast} />
    </DndContext>
  );
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#1e293b',
    backgroundColor: 'transparent',
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
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
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
  chartScroller: {
    overflowX: 'auto',
    overflowY: 'auto',
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    minHeight: '200px',
  },
  chartInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    minWidth: 'fit-content',
  },
  vpRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    alignItems: 'flex-start',
  },
  orphanSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    paddingTop: '16px',
    borderTop: '1px dashed #cbd5e1',
    width: '100%',
  },
  orphanLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  orphanRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.5',
    maxWidth: '320px',
  },
  poolSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  poolTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e293b',
  },
  poolEmpty: {
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  poolRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  unassignedCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'grab',
    touchAction: 'none',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
  },
  dragOverlay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    width: '220px',
    pointerEvents: 'none',
  },
  dragOverlayName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dragOverlayBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#ffffff',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  pickerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 250,
    padding: '16px',
  },
  pickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  pickerTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  pickerDesc: {
    fontSize: '14px',
    color: '#475569',
    margin: 0,
    lineHeight: '1.5',
  },
  pickerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  pickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
  },
  pickerCancelBtn: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'center',
    marginTop: '4px',
  },
};

export default HierarchyOrgChart;
