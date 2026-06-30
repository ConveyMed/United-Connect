// @ts-check
const { test, expect } = require('../fixtures/auth.fixture');
const { waitForPageLoad } = require('../helpers/navigation');
const { TEST_PREFIX } = require('../fixtures/test-data');

test.describe('Admin - Manage Library', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/manage-library');
    await waitForPageLoad(adminPage);
  });

  test('should display manage library page', async ({ adminPage }) => {
    await expect(adminPage).toHaveURL(/\/manage-library/);

    const header = adminPage.locator('h1').first();
    await expect(header).toContainText(/library/i);
  });

  test('should have Add Category button', async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("Add Category")')).toBeVisible();
  });

  test('should create a new category', async ({ adminPage }) => {
    const categoryName = `${TEST_PREFIX} Cat ${Date.now()}`;

    // Click Add Category button (the first one, not the modal button)
    await adminPage.locator('button:has-text("Add Category")').first().click();
    await adminPage.waitForTimeout(500);

    // Wait for modal to appear and fill in category name using text input
    await adminPage.locator('input[type="text"]').first().fill(categoryName);

    // Click the button inside modal that adds the category
    await adminPage.locator('button:has-text("Add Category")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify the category was created
    await expect(adminPage.locator(`text=${categoryName}`)).toBeVisible({ timeout: 5000 });
  });

  test('should show category with edit and delete buttons', async ({ adminPage }) => {
    const categoryName = `${TEST_PREFIX} EditTest ${Date.now()}`;

    // Create a category first
    await adminPage.locator('button:has-text("Add Category")').first().click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(categoryName);
    await adminPage.locator('button:has-text("Add Category")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify category exists
    await expect(adminPage.locator(`text=${categoryName}`)).toBeVisible({ timeout: 5000 });

    // Verify the category has buttons (edit and delete are icon buttons)
    // Each category card should have buttons for edit and delete
    const categoryCard = adminPage.locator(`text=${categoryName}`).locator('xpath=ancestor::div[contains(@style, "background")]').first();
    await expect(categoryCard.locator('button').first()).toBeVisible();
  });

  test('should delete a category', async ({ adminPage }) => {
    const categoryName = `${TEST_PREFIX} DelCat ${Date.now()}`;

    // Create a category first
    await adminPage.locator('button:has-text("Add Category")').first().click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(categoryName);
    await adminPage.locator('button:has-text("Add Category")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify it was created
    await expect(adminPage.locator(`text=${categoryName}`)).toBeVisible({ timeout: 5000 });

    // Find the category header and click the delete button (second icon button after drag handle)
    // Structure is: drag handle | category info | edit btn | delete btn | expand icon
    const categoryHeader = adminPage.locator(`h3:has-text("${categoryName}")`).locator('..');
    const deleteButton = categoryHeader.locator('..').locator('button').nth(1);
    await deleteButton.click();
    await adminPage.waitForTimeout(500);

    // Confirm deletion - the modal has "Delete Category" button
    await adminPage.locator('button:has-text("Delete Category")').click();
    await adminPage.waitForTimeout(1500);

    // Verify it was deleted
    await expect(adminPage.locator(`text=${categoryName}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should expand category and show Add Content button', async ({ adminPage }) => {
    const categoryName = `${TEST_PREFIX} ExpandTest ${Date.now()}`;

    // Create a category
    await adminPage.locator('button:has-text("Add Category")').first().click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(categoryName);
    await adminPage.locator('button:has-text("Add Category")').last().click();
    await adminPage.waitForTimeout(1500);

    // Verify category exists
    await expect(adminPage.locator(`text=${categoryName}`)).toBeVisible({ timeout: 5000 });

    // Click on category name to expand
    await adminPage.locator(`h3:has-text("${categoryName}")`).click();
    await adminPage.waitForTimeout(500);

    // Should see Add Content button (the one within the category, not the global multi-category one)
    const addContentButton = adminPage.locator('button:has-text("Add Content")').filter({ hasText: /^Add Content$/ });
    await expect(addContentButton.first()).toBeVisible();
  });

  test('should add content to an expanded category', async ({ adminPage }) => {
    const categoryName = `${TEST_PREFIX} ContentCat ${Date.now()}`;
    const contentTitle = `${TEST_PREFIX} Item ${Date.now()}`;

    // Create category
    await adminPage.locator('button:has-text("Add Category")').first().click();
    await adminPage.waitForTimeout(500);
    await adminPage.locator('input[type="text"]').first().fill(categoryName);
    await adminPage.locator('button:has-text("Add Category")').last().click();
    await adminPage.waitForTimeout(1500);

    // Expand category
    await adminPage.locator(`h3:has-text("${categoryName}")`).click();
    await adminPage.waitForTimeout(500);

    // Click the Add Content button inside the category (not the multi-category button)
    const addContentBtn = adminPage.locator('button').filter({ hasText: /^Add Content$/ }).first();
    await addContentBtn.click();
    await adminPage.waitForTimeout(500);

    // The modal should have a text input for title
    await adminPage.locator('input[type="text"]').first().fill(contentTitle);

    // Click Add Content button in modal
    await adminPage.locator('button').filter({ hasText: /^Add Content$/ }).last().click();
    await adminPage.waitForTimeout(1500);

    // Verify content was added
    await expect(adminPage.locator(`text=${contentTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test('should have Add Content to Multiple Categories button', async ({ adminPage }) => {
    // This button should always be visible
    await expect(adminPage.locator('button:has-text("Add Content to Multiple Categories")')).toBeVisible();
  });
});
