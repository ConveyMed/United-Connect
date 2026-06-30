// Test user credentials - use environment variables in CI
module.exports = {
  REGULAR_USER: {
    email: process.env.TEST_USER_EMAIL || 'playwright-user@test.com',
    password: process.env.TEST_USER_PASSWORD || 'PlaywrightTest123!',
  },
  ADMIN_USER: {
    email: process.env.TEST_ADMIN_EMAIL || 'playwright-admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'PlaywrightAdmin123!',
  },

  // Storage state file paths
  AUTH_FILES: {
    user: '.auth/user.json',
    admin: '.auth/admin.json',
  },

  // Prefix for test-created content (for cleanup)
  TEST_PREFIX: '[PLAYWRIGHT]',
};
