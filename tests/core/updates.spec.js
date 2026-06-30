// @ts-check
const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Updates', () => {
  test('should display updates page', async ({ userPage }) => {
    await userPage.goto('/updates');
    await waitForPageLoad(userPage);

    await expect(userPage).toHaveURL(/\/updates/);
  });

  test('should show tabs', async ({ userPage }) => {
    await userPage.goto('/updates');
    await waitForPageLoad(userPage);

    const tabs = userPage.locator('button');
    await expect(tabs.first()).toBeVisible({ timeout: 5000 });
  });
});
