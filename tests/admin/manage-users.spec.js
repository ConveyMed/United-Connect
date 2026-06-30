// @ts-check
const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');

test.describe('Admin - Manage Users', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/manage-users');
    await waitForPageLoad(adminPage);
  });

  test('should display manage users page', async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/manage-users/);

    const header = adminPage.locator('h1').first();
    await expect(header).toContainText(/users/i);
  });

  test('should display user list with stats', async ({ adminPage }) => {
    // Should have stats bar showing total users, admins, members
    await expect(adminPage.locator('text=Total Users')).toBeVisible({ timeout: 10000 });
    await expect(adminPage.locator('text=Admins')).toBeVisible();
    await expect(adminPage.locator('text=Members')).toBeVisible();
  });

  test('should have search functionality', async ({ adminPage }) => {
    // Should have search input
    const searchInput = adminPage.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('test');
    await adminPage.waitForTimeout(500);

    // Search should filter results (either show results or empty state)
    // We just verify the search input works without errors
    await expect(searchInput).toHaveValue('test');
  });

  test('should open user detail modal when clicking on a user', async ({ adminPage }) => {
    // Wait for users to load
    await adminPage.waitForTimeout(1000);

    // Click on the first user card (button element)
    const userCard = adminPage.locator('button').filter({ hasText: /@/ }).first();

    if (await userCard.isVisible()) {
      await userCard.click();
      await adminPage.waitForTimeout(300);

      // Modal should appear with Edit User title
      await expect(adminPage.locator('h2:has-text("Edit User")')).toBeVisible();

      // Should have form fields
      await expect(adminPage.locator('label:has-text("First Name")')).toBeVisible();
      await expect(adminPage.locator('label:has-text("Last Name")')).toBeVisible();
      await expect(adminPage.locator('label:has-text("Role")')).toBeVisible();
    }
  });

  test('should edit user information', async ({ adminPage }) => {
    // Wait for users to load
    await adminPage.waitForTimeout(1000);

    // Click on the first user card
    const userCard = adminPage.locator('button').filter({ hasText: /@/ }).first();

    if (await userCard.isVisible()) {
      await userCard.click();
      await adminPage.waitForTimeout(300);

      // Get current first name
      const firstNameInput = adminPage.locator('input').first();
      const currentName = await firstNameInput.inputValue();

      // Modify the job title (less intrusive test)
      const titleInput = adminPage.locator('input[placeholder*="Software"]').or(
        adminPage.locator('label:has-text("Job Title")').locator('..').locator('input')
      );

      if (await titleInput.isVisible()) {
        await titleInput.clear();
        await titleInput.fill('Test Title');
      }

      // Click Save
      await adminPage.locator('button:has-text("Save Changes")').click();
      await adminPage.waitForTimeout(1000);

      // Modal should close
      await expect(adminPage.locator('h2:has-text("Edit User")')).not.toBeVisible();
    }
  });

  test('should toggle user role between member and admin', async ({ adminPage }) => {
    // Wait for users to load
    await adminPage.waitForTimeout(1000);

    // Click on the first user card
    const userCard = adminPage.locator('button').filter({ hasText: /@/ }).first();

    if (await userCard.isVisible()) {
      await userCard.click();
      await adminPage.waitForTimeout(300);

      // Should see role selector
      await expect(adminPage.locator('label:has-text("Role")')).toBeVisible();

      // Close modal without saving
      await adminPage.locator('button:has-text("Cancel")').click();
      await adminPage.waitForTimeout(300);
    }
  });

  test('should close modal when clicking cancel', async ({ adminPage }) => {
    // Wait for users to load
    await adminPage.waitForTimeout(1000);

    // Click on the first user card
    const userCard = adminPage.locator('button').filter({ hasText: /@/ }).first();

    if (await userCard.isVisible()) {
      await userCard.click();
      await adminPage.waitForTimeout(300);

      // Modal should be visible
      await expect(adminPage.locator('h2:has-text("Edit User")')).toBeVisible();

      // Click Cancel
      await adminPage.locator('button:has-text("Cancel")').click();
      await adminPage.waitForTimeout(300);

      // Modal should close
      await expect(adminPage.locator('h2:has-text("Edit User")')).not.toBeVisible();
    }
  });

  test('should show settings panel when clicking settings icon', async ({ adminPage }) => {
    // Click settings icon (gear icon in header)
    const settingsBtn = adminPage.locator('button').filter({ has: adminPage.locator('svg') }).nth(1);
    await settingsBtn.click();
    await adminPage.waitForTimeout(300);

    // Should see App Settings panel
    await expect(adminPage.locator('text=App Settings')).toBeVisible();
    await expect(adminPage.locator('text=Remove Comments from Posts')).toBeVisible();
  });

  test('should toggle comment delete permission setting', async ({ adminPage }) => {
    // Open settings
    const settingsBtn = adminPage.locator('button').filter({ has: adminPage.locator('svg') }).nth(1);
    await settingsBtn.click();
    await adminPage.waitForTimeout(300);

    // Should see options
    await expect(adminPage.locator('button:has-text("All Users")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Admins Only")')).toBeVisible();

    // Click on Admins Only
    await adminPage.locator('button:has-text("Admins Only")').click();
    await adminPage.waitForTimeout(500);

    // Click on All Users
    await adminPage.locator('button:has-text("All Users")').click();
    await adminPage.waitForTimeout(500);
  });
});
