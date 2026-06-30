// @ts-check
const { test: setup, expect } = require('@playwright/test');
const { REGULAR_USER, ADMIN_USER, AUTH_FILES } = require('./test-data');

// Create authenticated state for regular user
setup('authenticate regular user', async ({ page }) => {
  await page.goto('/');

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill login form
  await page.fill('input[type="email"]', REGULAR_USER.email);
  await page.fill('input[type="password"]', REGULAR_USER.password);

  // Click sign in button
  await page.locator('button:has-text("Sign In")').click();

  // Wait for either redirect or error
  await page.waitForTimeout(3000);

  // Check for error message
  const errorMsg = page.locator('text=/invalid|error|wrong|failed/i');
  if (await errorMsg.isVisible().catch(() => false)) {
    const errorText = await errorMsg.textContent();
    throw new Error(`Login failed: ${errorText}`);
  }

  // Wait for redirect to home or profile-complete
  await page.waitForURL(/\/(home|profile-complete)/, { timeout: 30000 });

  // If on profile-complete, we need to skip (user hasn't completed profile)
  if (page.url().includes('profile-complete')) {
    console.log('Warning: Regular test user needs profile completion');
  }

  // Save storage state
  await page.context().storageState({ path: AUTH_FILES.user });
});

// Create authenticated state for admin user
setup('authenticate admin user', async ({ page }) => {
  await page.goto('/');

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill login form
  await page.fill('input[type="email"]', ADMIN_USER.email);
  await page.fill('input[type="password"]', ADMIN_USER.password);

  // Click sign in button
  await page.locator('button:has-text("Sign In")').click();

  // Wait for either redirect or error
  await page.waitForTimeout(3000);

  // Check for error message
  const errorMsg = page.locator('text=/invalid|error|wrong|failed/i');
  if (await errorMsg.isVisible().catch(() => false)) {
    const errorText = await errorMsg.textContent();
    throw new Error(`Login failed: ${errorText}`);
  }

  // Wait for redirect
  await page.waitForURL(/\/(home|profile-complete)/, { timeout: 30000 });

  if (page.url().includes('profile-complete')) {
    console.log('Warning: Admin test user needs profile completion');
  }

  // Save storage state
  await page.context().storageState({ path: AUTH_FILES.admin });
});
