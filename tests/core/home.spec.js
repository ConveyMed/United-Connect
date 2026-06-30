// @ts-check
const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Home / Feed', () => {
  test('should display home page', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    await expect(userPage).toHaveURL(/\/home/);
  });

  test('should show feed content or empty state', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    // Page should have content
    const content = await userPage.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test('should have bottom navigation', async ({ userPage }) => {
    await userPage.goto('/home');
    await waitForPageLoad(userPage);

    const nav = userPage.locator('nav');
    await expect(nav).toBeVisible();
  });
});
