export const ROLE_COLORS = {
  vp: '#7c3aed',
  manager: '#2563eb',
  rep: '#059669',
};

export const ROLE_LABELS = {
  vp: 'VP',
  manager: 'Manager',
  rep: 'Rep',
};

export const ROLE_ORDER = ['rep', 'manager', 'vp'];

export const getUserName = (user) => {
  if (!user) return 'Unknown';
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown';
};
