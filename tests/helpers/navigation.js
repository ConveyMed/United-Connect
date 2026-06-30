// Navigation helper functions
const SELECTORS = require('./selectors');

/**
 * Navigate to a page using bottom nav
 */
async function navigateTo(page, destination) {
  const navMap = {
    home: SELECTORS.NAV_HOME,
    library: SELECTORS.NAV_LIBRARY,
    training: SELECTORS.NAV_TRAINING,
    updates: SELECTORS.NAV_UPDATES,
  };

  if (navMap[destination.toLowerCase()]) {
    await page.locator(navMap[destination.toLowerCase()]).click();
    await page.waitForLoadState('domcontentloaded');
    return;
  }

  // Items in "More" menu
  const moreMenuMap = {
    profile: SELECTORS.MENU_PROFILE,
    chat: SELECTORS.MENU_CHAT,
    directory: SELECTORS.MENU_DIRECTORY,
    downloads: SELECTORS.MENU_DOWNLOADS,
  };

  if (moreMenuMap[destination.toLowerCase()]) {
    // Open More menu first
    await page.locator(SELECTORS.NAV_MORE).click();
    await page.waitForTimeout(300); // Wait for menu animation
    await page.locator(moreMenuMap[destination.toLowerCase()]).click();
    await page.waitForLoadState('domcontentloaded');
  }
}

/**
 * Navigate to admin page from Profile
 */
async function navigateToAdmin(page, adminPage) {
  // First go to profile
  await navigateTo(page, 'profile');

  const adminMap = {
    users: SELECTORS.MANAGE_USERS,
    library: SELECTORS.MANAGE_LIBRARY,
    training: SELECTORS.MANAGE_TRAINING,
    updates: SELECTORS.MANAGE_UPDATES,
    chat: SELECTORS.MANAGE_CHAT,
  };

  if (adminMap[adminPage.toLowerCase()]) {
    await page.locator(adminMap[adminPage.toLowerCase()]).click();
    await page.waitForLoadState('domcontentloaded');
  }
}

/**
 * Wait for page to fully load
 */
async function waitForPageLoad(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500); // Brief wait for React to render
}

/**
 * Go back using browser or back button
 */
async function goBack(page) {
  const backButton = page.locator(SELECTORS.BACK_BUTTON);
  if (await backButton.isVisible()) {
    await backButton.click();
  } else {
    await page.goBack();
  }
  await page.waitForLoadState('domcontentloaded');
}

module.exports = {
  navigateTo,
  navigateToAdmin,
  waitForPageLoad,
  goBack,
};
