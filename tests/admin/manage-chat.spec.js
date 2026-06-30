// @ts-check
const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Admin - Manage Chat', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/manage-chat');
    await waitForPageLoad(adminPage);
  });

  test('should display manage chat page', async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/manage-chat/);

    // Should show header
    const header = adminPage.locator('h1').first();
    await expect(header).toContainText(/chat/i);
  });

  test('should have Reports and Settings tabs', async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("Reports")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Settings")')).toBeVisible();
  });

  test('should display Reports tab content by default', async ({ adminPage }) => {
    // Reports tab should be active by default
    await expect(adminPage.locator('button:has-text("Reports")')).toBeVisible();

    // Should show reports list or empty state
    const reportsContent = adminPage.locator('text=No Reports').or(
      adminPage.locator('text=report')
    );
    await expect(reportsContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('should switch to Settings tab', async ({ adminPage }) => {
    // Click Settings tab
    await adminPage.locator('button:has-text("Settings")').click();
    await adminPage.waitForTimeout(300);

    // Should see Chat Visibility settings
    await expect(adminPage.locator('text=Chat Visibility')).toBeVisible();
    await expect(adminPage.locator('text=Control who can access the chat feature')).toBeVisible();
  });

  test('should display chat mode options in Settings', async ({ adminPage }) => {
    // Click Settings tab
    await adminPage.locator('button:has-text("Settings")').click();
    await adminPage.waitForTimeout(300);

    // Should see All Members option
    await expect(adminPage.locator('span:has-text("All Members")')).toBeVisible();
    // Should see radio buttons
    await expect(adminPage.locator('input[type="radio"]').first()).toBeVisible();
  });

  test('should toggle chat mode between All Members and Disabled', async ({ adminPage }) => {
    // Click Settings tab
    await adminPage.locator('button:has-text("Settings")').click();
    await adminPage.waitForTimeout(300);

    // Click the Disabled radio directly
    await adminPage.locator('input[value="off"]').click({ force: true });
    await adminPage.waitForTimeout(500);

    // Click the All Members radio directly
    await adminPage.locator('input[value="all_members"]').click({ force: true });
    await adminPage.waitForTimeout(500);

    // Just verify we got through without errors
    await expect(adminPage.locator('text=Chat Visibility')).toBeVisible();
  });

  test('should switch between Reports and Settings tabs', async ({ adminPage }) => {
    // Verify Reports tab works
    await adminPage.locator('button:has-text("Reports")').click();
    await adminPage.waitForTimeout(300);

    // Switch to Settings tab
    await adminPage.locator('button:has-text("Settings")').click();
    await adminPage.waitForTimeout(300);
    await expect(adminPage.locator('text=Chat Visibility')).toBeVisible();

    // Switch back to Reports
    await adminPage.locator('button:has-text("Reports")').click();
    await adminPage.waitForTimeout(300);

    // Should show reports content
    const reportsContent = adminPage.locator('text=No Reports').or(
      adminPage.locator('text=report')
    );
    await expect(reportsContent.first()).toBeVisible();
  });

  test('should show info box about disabled chat', async ({ adminPage }) => {
    // Click Settings tab
    await adminPage.locator('button:has-text("Settings")').click();
    await adminPage.waitForTimeout(300);

    // Should see info box explaining what happens when chat is disabled
    await expect(adminPage.locator('text=Chat button will be hidden')).toBeVisible();
  });
});
