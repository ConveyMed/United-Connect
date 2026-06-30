// @ts-check
const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Directory', () => {
  test('should display directory page', async ({ userPage }) => {
    await userPage.goto('/directory');
    await waitForPageLoad(userPage);

    await expect(userPage).toHaveURL(/\/directory/);
  });

  test('should show header', async ({ userPage }) => {
    await userPage.goto('/directory');
    await waitForPageLoad(userPage);

    const header = userPage.locator('h1').first();
    await expect(header).toContainText(/directory/i);
  });
});
