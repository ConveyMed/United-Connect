// Centralized selectors for maintainability
// Update these if the app's HTML structure changes

module.exports = {
  // Auth / Login
  EMAIL_INPUT: 'input[type="email"]',
  PASSWORD_INPUT: 'input[type="password"]',
  SIGN_IN_BUTTON: 'button:has-text("Sign In")',
  SIGN_UP_LINK: 'text=/sign up/i',

  // Navigation (Bottom Nav)
  BOTTOM_NAV: 'nav',
  NAV_HOME: 'text=Home',
  NAV_LIBRARY: 'text=Library',
  NAV_TRAINING: 'text=Training',
  NAV_UPDATES: 'text=Updates',
  NAV_MORE: 'text=More',

  // More Menu Items
  MENU_PROFILE: 'text=Profile',
  MENU_CHAT: 'text=Chat',
  MENU_DIRECTORY: 'text=Directory',
  MENU_DOWNLOADS: 'text=Downloads',

  // Headers
  HEADER_TITLE: 'h1',

  // Profile Page - Admin Controls
  MANAGE_USERS: 'text=Manage Users',
  MANAGE_LIBRARY: 'text=Manage Library',
  MANAGE_TRAINING: 'text=Manage Training',
  MANAGE_UPDATES: 'text=Manage Notifications',
  MANAGE_CHAT: 'text=Manage Chat',

  // Home / Posts
  POST_CARD: 'article, [data-testid="post"]',
  CREATE_POST_BUTTON: 'button:has-text("Create"), button:has-text("Post")',
  LIKE_BUTTON: 'button:has-text("Like"), [aria-label*="like"]',
  COMMENT_BUTTON: 'button:has-text("Comment"), [aria-label*="comment"]',

  // Chat
  CHAT_ITEM: '[data-testid="chat-item"]',
  MESSAGE_INPUT: 'input[placeholder*="message"], textarea[placeholder*="message"]',
  SEND_BUTTON: 'button:has-text("Send"), button[aria-label="Send"]',

  // Library / Content
  CONTENT_ITEM: '[data-testid="content-item"]',
  CATEGORY_SECTION: '[data-testid="category"]',

  // Updates / Notifications
  NOTIFICATION_ITEM: '[data-testid="notification"]',
  RSVP_YES: 'button:has-text("Yes")',
  RSVP_NO: 'button:has-text("No")',

  // Directory
  USER_CARD: '[data-testid="user-card"]',
  SEARCH_INPUT: 'input[placeholder*="Search"], input[type="search"]',

  // Common
  LOADING_SPINNER: '[data-testid="loading"], .loading',
  BACK_BUTTON: 'button:has-text("Back"), [aria-label="Back"]',
  DELETE_BUTTON: 'button:has-text("Delete")',
  SAVE_BUTTON: 'button:has-text("Save")',
  CONFIRM_BUTTON: 'button:has-text("Confirm"), button:has-text("Yes")',
  CANCEL_BUTTON: 'button:has-text("Cancel"), button:has-text("No")',
};
