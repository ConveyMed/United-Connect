// @ts-check
const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Library', () => {
  test('should display library page', async ({ userPage }) => {
    await userPage.goto('/library');
    await waitForPageLoad(userPage);

    await expect(userPage).toHaveURL(/\/library/);
  });

  test('should show header', async ({ userPage }) => {
    await userPage.goto('/library');
    await waitForPageLoad(userPage);

    const header = userPage.locator('h1').first();
    await expect(header).toContainText(/library/i);
  });
});
