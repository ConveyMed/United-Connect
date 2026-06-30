/**
 * THEME CONFIGURATION
 *
 * Change colors here to rebrand the entire app.
 * All components pull from this single source of truth.
 */

const theme = {
  // ===========================================
  // BRAND COLORS - Change these for each client
  // ===========================================
  brand: {
    primary: '#4CAC87',      // United Green - main brand color (buttons, links, accents)
    primaryLight: '#6CC2A0', // Lighter variant
    primaryDark: '#3A8568',  // Darker variant (hover states)
    accent: '#8FD0B6',       // Secondary accent
  },

  // ===========================================
  // ORGANIZATION COLORS (if using multi-org)
  // ===========================================
  orgs: {
    // Add org codes and their colors here
    // Example for RemedyGo:
    // OR: { primary: '#8246AF', dark: '#6d3a94', light: '#9d6bc4', bg: 'rgba(130, 70, 175, 0.1)' },
    // AM: { primary: '#3c763d', dark: '#2e5a2f', light: '#4a9a4c', bg: '#dff0d8' },
  },

  // ===========================================
  // NEUTRAL COLORS - Usually don't change
  // ===========================================
  neutral: {
    white: '#ffffff',
    offWhite: '#f8fafc',
    light: '#f1f5f9',
    border: '#e2e8f0',
    textLight: '#94a3b8',
    textMuted: '#64748b',
    textDark: '#1e293b',
  },

  // ===========================================
  // STATUS COLORS - Usually don't change
  // ===========================================
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get organization color by code
 * Returns object with { bg, hover, light, bgLight } for easy component usage
 * @param {string} orgCode - e.g., 'OR', 'AM'
 */
export const getOrgColor = (orgCode) => {
  const org = theme.orgs[orgCode];
  if (org) {
    return {
      bg: org.primary,
      hover: org.dark,
      light: org.light,
      bgLight: org.bg,
    };
  }
  // Fallback to brand colors
  return {
    bg: theme.brand.primary,
    hover: theme.brand.primaryDark,
    light: theme.brand.primaryLight,
    bgLight: 'rgba(30, 64, 175, 0.1)',
  };
};

/**
 * Check if multi-org is enabled
 */
export const hasMultiOrg = () => Object.keys(theme.orgs).length > 0;

/**
 * Generate CSS variables string for injection
 */
export const generateCSSVariables = () => `
  :root {
    /* Brand Colors */
    --primary: ${theme.brand.primary};
    --primary-light: ${theme.brand.primaryLight};
    --primary-dark: ${theme.brand.primaryDark};
    --accent: ${theme.brand.accent};

    /* RGB versions for rgba() usage */
    --primary-rgb: ${hexToRgb(theme.brand.primary)};

    /* Neutral Colors */
    --white: ${theme.neutral.white};
    --off-white: ${theme.neutral.offWhite};
    --bg-light: ${theme.neutral.light};
    --border: ${theme.neutral.border};
    --text-light: ${theme.neutral.textLight};
    --text-muted: ${theme.neutral.textMuted};
    --text-dark: ${theme.neutral.textDark};

    /* Status Colors */
    --success: ${theme.status.success};
    --warning: ${theme.status.warning};
    --error: ${theme.status.error};
    --info: ${theme.status.info};

    /* Legacy variable names for compatibility */
    --primary-blue: ${theme.brand.primary};
    --primary-blue-light: ${theme.brand.primaryLight};
    --primary-blue-dark: ${theme.brand.primaryDark};
    --accent-blue: ${theme.brand.accent};
    --primary-blue-rgb: ${hexToRgb(theme.brand.primary)};
    --background-white: ${theme.neutral.white};
    --background-off-white: ${theme.neutral.offWhite};
    --border-light: ${theme.neutral.border};
    --text-dark-rgb: ${hexToRgb(theme.neutral.textDark)};
  }
`;

/**
 * Convert hex to RGB string
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

/**
 * Inject theme CSS variables into document
 * Call this once in App.js or index.js
 */
export const injectTheme = () => {
  if (typeof document === 'undefined') return;

  const styleId = 'app-theme-variables';
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.insertBefore(styleEl, document.head.firstChild);
  }

  styleEl.textContent = generateCSSVariables();
};

export default theme;
