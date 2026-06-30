// @ts-check
const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');
const { TEST_PREFIX } = require('../fixtures/test-data');

test.describe('Admin - Manage Updates', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/manage-updates');
    await waitForPageLoad(adminPage);
  });

  test('should display manage updates page with tabs', async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/manage-updates/);

    // Should have Updates and Events tabs
    await expect(adminPage.locator('button:has-text("Updates")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Events")')).toBeVisible();
  });

  test('should create a new update', async ({ adminPage }) => {
    const updateTitle = `${TEST_PREFIX} Update ${Date.now()}`;

    // Make sure we're on Updates tab
    await adminPage.locator('button:has-text("Updates")').first().click();
    await adminPage.waitForTimeout(300);

    // Click Create Update button
    await adminPage.locator('button:has-text("Create Update")').click();
    await adminPage.waitForTimeout(500);

    // Fill in the title (first text input in modal)
    await adminPage.locator('input[type="text"]').first().fill(updateTitle);

    // Click Create button in modal
    await adminPage.locator('button:has-text("Create")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify the update was created
    await expect(adminPage.locator(`text=${updateTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test('should create a new event', async ({ adminPage }) => {
    const eventTitle = `${TEST_PREFIX} Event ${Date.now()}`;

    // Click Events tab
    await adminPage.locator('button:has-text("Events")').first().click();
    await adminPage.waitForTimeout(300);

    // Click Create Event button
    await adminPage.locator('button:has-text("Create Event")').click();
    await adminPage.waitForTimeout(500);

    // Fill in the title
    await adminPage.locator('input[type="text"]').first().fill(eventTitle);

    // Click Create button in modal
    await adminPage.locator('button:has-text("Create")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify the event was created
    await expect(adminPage.locator(`text=${eventTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test('should show update card with action buttons', async ({ adminPage }) => {
    const updateTitle = `${TEST_PREFIX} ActionsTest ${Date.now()}`;

    // Create an update first
    await adminPage.locator('button:has-text("Updates")').first().click();
    await adminPage.waitForTimeout(300);
    await adminPage.locator('button:has-text("Create Update")').click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(updateTitle);
    await adminPage.locator('button:has-text("Create")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify it was created with the title visible
    await expect(adminPage.locator(`h3:has-text("${updateTitle}")`)).toBeVisible({ timeout: 5000 });

    // Verify the card shows the Update badge
    await expect(adminPage.locator('text=Update').first()).toBeVisible();

    // Verify there are icon buttons (edit/delete) on the page
    await expect(adminPage.locator('button').filter({ has: adminPage.locator('svg') }).first()).toBeVisible();
  });

  test('should switch between Updates and Events tabs', async ({ adminPage }) => {
    // Verify Updates tab works
    await adminPage.locator('button:has-text("Updates")').first().click();
    await adminPage.waitForTimeout(300);
    await expect(adminPage.locator('button:has-text("Create Update")')).toBeVisible();

    // Switch to Events tab
    await adminPage.locator('button:has-text("Events")').first().click();
    await adminPage.waitForTimeout(300);
    await expect(adminPage.locator('button:has-text("Create Event")')).toBeVisible();

    // Switch back to Updates
    await adminPage.locator('button:has-text("Updates")').first().click();
    await adminPage.waitForTimeout(300);
    await expect(adminPage.locator('button:has-text("Create Update")')).toBeVisible();
  });
});
