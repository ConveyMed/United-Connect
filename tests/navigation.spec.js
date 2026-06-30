// @ts-check
const { test, expect } = require('./fixtures/auth.fixture');
const base = require('@playwright/test');
const { waitForPageLoad } = require('./helpers/navigation');

test.describe('Navigation - Authenticated', () => {
  test('should show bottom nav', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    const nav = userPage.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should navigate between pages', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    // Click Library
    await userPage.locator('text=Library').click();
    await expect(userPage).toHaveURL(/\/library/);

    // Click Training
    await userPage.locator('text=Training').click();
    await expect(userPage).toHaveURL(/\/training/);
  });
});

base.test.describe('Navigation - Unauthenticated', () => {
  base.test('should redirect to login', async ({ page }) => {
    await page.goto('/home');
    // Should redirect to root (login page)
    await page.waitForTimeout(3000);
    expect(page.url()).toMatch(/\/$/);
  });
});
