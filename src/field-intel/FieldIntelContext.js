import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

const FieldIntelContext = createContext({});

export const useFieldIntel = () => {
  const context = useContext(FieldIntelContext);
  if (!context) {
    throw new Error('useFieldIntel must be used within a FieldIntelProvider');
  }
  return context;
};

export const FieldIntelProvider = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [role, setRole] = useState(null);
  const [regionIds, setRegionIds] = useState([]);
  const [allowedRegionIds, setAllowedRegionIds] = useState([]);
  const [parentUserId, setParentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminOverride, setAdminOverride] = useState(false);

  // Extract stable primitives for the dependency array
  const userId = user?.id || null;
  const profileIsAdmin = userProfile?.is_admin === true;
  const profileIsOwner = userProfile?.is_owner === true;
  const profileRole = userProfile?.role || null;
  const profileLoaded = !!userProfile;

  const isActualAdmin = profileIsAdmin || profileIsOwner || profileRole === 'admin' || profileRole === 'owner';

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setRegionIds([]);
      setAllowedRegionIds([]);
      setParentUserId(null);
      setLoading(false);
      return;
    }

    // Wait for userProfile to finish loading
    if (!profileLoaded) {
      return;
    }

    const fetchHierarchy = async () => {
      setLoading(true);

      // Admin/Owner gets admin dashboard unless override is active
      if (isActualAdmin && !adminOverride) {
        setRole('admin');
        setRegionIds([]);
        setAllowedRegionIds([]);
        setParentUserId(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('hierarchy_assignments')
          .select('role_tier, parent_user_id, region_id')
          .eq('user_id', userId);

        if (error) {
          console.error('[FieldIntel] Error fetching hierarchy:', error);
          setRole(null);
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setRole(null);
          setRegionIds([]);
          setAllowedRegionIds([]);
          setParentUserId(null);
          setLoading(false);
          return;
        }

        const assignment = data[0];
        setRole(assignment.role_tier);
        setParentUserId(assignment.parent_user_id);

        const myRegions = data
          .map(d => d.region_id)
          .filter(Boolean);
        setRegionIds(myRegions);

        // Resolve VP's regions for all roles
        if (assignment.role_tier === 'vp') {
          // VP: use own regions directly
          setAllowedRegionIds(myRegions);
        } else {
          // Manager/Rep: walk up the chain to find the VP
          let currentParent = assignment.parent_user_id;
          let vpRegions = [];
          const visited = new Set();

          while (currentParent && !visited.has(currentParent)) {
            visited.add(currentParent);
            const { data: parentAssigns } = await supabase
              .from('hierarchy_assignments')
              .select('role_tier, parent_user_id, region_id')
              .eq('user_id', currentParent);

            if (!parentAssigns || parentAssigns.length === 0) break;

            if (parentAssigns[0].role_tier === 'vp') {
              vpRegions = parentAssigns.map(a => a.region_id).filter(Boolean);
              break;
            }
            currentParent = parentAssigns[0].parent_user_id;
          }

          setAllowedRegionIds(vpRegions);
        }
      } catch (err) {
        console.error('[FieldIntel] Error:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, [userId, profileLoaded, isActualAdmin, adminOverride]);

  const toggleAdminOverride = () => {
    setAdminOverride(prev => !prev);
  };

  const value = {
    role,
    regionIds,
    allowedRegionIds,
    parentUserId,
    loading,
    isActualAdmin,
    adminOverride,
    toggleAdminOverride,
  };

  return (
    <FieldIntelContext.Provider value={value}>
      {children}
    </FieldIntelContext.Provider>
  );
};
