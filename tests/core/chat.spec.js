// @ts-check
const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Chat / Messages', () => {
  test('should display chat page', async ({ userPage }) => {
    await userPage.goto('/chat');
    await waitForPageLoad(userPage);

    await expect(userPage).toHaveURL(/\/chat/);
  });

  test('should show header', async ({ userPage }) => {
    await userPage.goto('/chat');
    await waitForPageLoad(userPage);

    const header = userPage.locator('h1').first();
    await expect(header).toContainText(/messages/i);
  });
});
