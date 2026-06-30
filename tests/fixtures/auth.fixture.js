// @ts-check
const base = require('@playwright/test');
const { AUTH_FILES } = require('./test-data');

// Extend base test with authenticated contexts
const test = base.test.extend({
  // Regular user page - already authenticated
  userPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: AUTH_FILES.user
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Admin user page - already authenticated with admin privileges
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: AUTH_FILES.admin
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

module.exports = { test, expect: base.expect };
