# App Build & Publish Checklist

**App Name:**
**Client:**
**Created:**
**Status:** Phase 1

---

## Phase 1 & 2: Gather Data & Build

Start building with what you have. Fill in gaps as they come in.

### Client Info
| Field | Value | Status |
|-------|-------|--------|
| Company Name (Short) | | |
| Company Name (Full) | | |
| App Name | | |
| Bundle ID | | |
| Primary Color | | |
| Secondary Color | | |
| Logo File | | |
| Description | | |
| Keywords | | |

### Legal Info (can wait until Phase 3)
| Field | Value | Status |
|-------|-------|--------|
| Company Address | | |
| Company Email | | |
| Company Phone | | |
| Governing State | | |
| Bug Report URL | | |

### From Mike (email or ask him)
| Item | Value | Status |
|------|-------|--------|
| GitHub repo created (under ConveyMed org) | | waiting on Mike |
| Chase added as collaborator on repo | | waiting on Mike |
| Netlify site created & linked to GitHub repo | | waiting on Mike |
| Bunny API Key | | waiting on Mike |
| Bunny Library ID | | waiting on Mike |
| Bunny Token Auth Key | | waiting on Mike |
| Bug Report URL (monday.com form) | | waiting on Mike |
| Company Address | | waiting on Mike |
| Company Email | | waiting on Mike |
| Company Phone | | waiting on Mike |
| Governing State | | waiting on Mike |

### Service Keys (Chase creates these)
| Service | Key | Value | Status |
|---------|-----|-------|--------|
| Supabase | Project URL | | |
| Supabase | Anon Key | | |
| Supabase | Service Role Key | | |
| OneSignal | App ID | | |
| OneSignal | REST API Key | | |
| Gemini | API Key | | use shared |
| Netlify | Site Name | | |

Status options: `done` / `waiting on Mike` / `use shared` / blank

### What's Needed to Start Building
- [ ] App name + bundle ID
- [ ] Primary color
- [ ] Supabase project (URL + keys)
- [ ] GitHub repo created (Mike creates, adds Chase as collaborator)
- [ ] Netlify site created & linked to repo (Mike does this)

### What Can Wait
- Logo (use placeholder, swap later)
- Legal/company info (get from Mike before publish)
- Bug report URL (get from Mike before publish)
- Bunny keys (waiting on Mike is normal)
- OneSignal (can set up after build)

---

## Build Steps

Follow the duplication checklist in `INSTRUCTIONS.md` (sections 1-11). Claude handles all of this.

- [ ] Copy template to `/Users/chasekellis/Apps/[app-name]`
- [ ] Update all config files (see INSTRUCTIONS.md sections 1-4)
- [ ] Run `./scripts/generate-icons.sh path/to/client-logo-1024.png` (generates ALL web/iOS/Android/store icons)
- [ ] Update iOS native files (see INSTRUCTIONS.md section 6)
- [ ] Update Android native files (see INSTRUCTIONS.md section 7)
- [ ] Set feature toggles in app_settings (see INSTRUCTIONS.md section 8)
- [ ] Remove template docs (see INSTRUCTIONS.md section 9)
- [ ] Confirm .env is in .gitignore (see INSTRUCTIONS.md section 10)
- [ ] Run final grep sweep -- ZERO results (see INSTRUCTIONS.md section 11)
- [ ] Init git, commit, push to GitHub

### Supabase Setup
Claude does via MCP (once Chase provides project keys):
- [ ] Run schema SQL
- [ ] Create storage buckets (profile-images, post-images, chat-attachments, content-files)
- [ ] Set secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ONESIGNAL keys, GEMINI_API_KEY)
- [ ] Deploy edge functions (ai-chat, send-push-notification, notification-dispatcher) with --no-verify-jwt
- [ ] Enable Realtime (posts, notifications, messages, chat_typing, message_reactions)
- [ ] Turn off email confirmation (Auth > Providers > Email > disable "Confirm email")
- [ ] Create org code in `organization_codes` table
- [ ] Create `support_requests` table if not in schema
- [ ] Clear `product_docs` table (no demo data in client app)

Chase does manually (no MCP for these):
- [ ] Set Auth URL config (Site URL: `https://[SITE].netlify.app`, Redirects: `https://[SITE].netlify.app/**` + `com.[bundleid]://`)
- [ ] Update email templates (copy from `email-templates/`, update branding)

### Test Accounts
| Account | Email | Password | Purpose |
|---------|-------|----------|---------|
| Chase (dev/admin) | TheK2way17@gmail.com | Pri123456! | Development & testing |
| Apple Review | Test@email.com | AppleTest | Required for App Store review |
| Client test | | | For client beta testing |

### Netlify Setup
- [ ] Mike creates site & links to GitHub repo -- **Mike does this**
- [ ] Set environment variables -- **Claude does via CLI** (see INSTRUCTIONS.md env var list)
- [ ] Trigger deploy
- [ ] Verify site loads at https://[SITE].netlify.app

### OneSignal Setup
- [ ] Chase creates app in OneSignal dashboard
- [ ] Upload .p8 APNs key (Key ID: 46WR2KRB9F, Team ID: 9B895DPQKP)
- [ ] Claude verifies app settings via MCP

### Build Outputs
| Output | Location |
|--------|----------|
| Web App | `https://___.netlify.app` |
| GitHub Repo | |

**Phase 2 complete?** [ ]

---

## Phase 3: Publish Setup

Get the app on TestFlight and Google Play internal testing. No screenshots needed yet.

### iOS - Xcode
- [ ] `npm run build && npx cap sync`
- [ ] Open Xcode: `npx cap open ios`
- [ ] Set bundle ID in project settings
- [ ] Replace AppIcon (1024x1024, no alpha channel, flatten to white bg)
- [ ] + Capability: **Push Notifications**
- [ ] + Capability: **Background Modes** > Remote notifications
- [ ] + Capability: **App Groups** > `group.[bundle.id].onesignal`
- [ ] Create **Notification Service Extension** target (name: `OneSignalNotificationServiceExtension`)
- [ ] Replace NotificationService.swift with OneSignal version
- [ ] Add **App Groups** to extension target (same group)
- [ ] Fix scheme: Manage Schemes > + > Target: App
- [ ] Update Podfile (add OneSignalXCFramework target for extension)
- [ ] `cd ios/App && pod install`
- [ ] Archive > Upload to App Store Connect
- [ ] Create app in App Store Connect (if first time)
- [ ] Submit to TestFlight

### Android - Gradle & Keystore
- [ ] `npm run build && npx cap sync`
- [ ] Generate upload keystore:
  ```bash
  keytool -genkey -v -keystore android/[app]-upload-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
  ```
- [ ] Add `*.jks` to `.gitignore`
- [ ] Configure signing in `android/app/build.gradle`:
  ```gradle
  signingConfigs {
      release {
          storeFile file('../[app]-upload-key.jks')
          storePassword '[password]'
          keyAlias 'upload'
          keyPassword '[password]'
      }
  }
  buildTypes {
      release {
          signingConfig signingConfigs.release
      }
  }
  ```
- [ ] Fix Gradle/AGP versions if needed (see publish/PUBLISH_CHECKLIST.md)
- [ ] Build AAB: `cd android && ./gradlew bundleRelease`
- [ ] Upload AAB to Google Play Console **internal testing** track
- [ ] Create app in Google Play Console (if first time)

### Publish Outputs
| Output | Location |
|--------|----------|
| Keystore | `android/___-upload-key.jks` |
| Keystore Password | |
| AAB File | `android/app/build/outputs/bundle/release/app-release.aab` |
| TestFlight Build | |
| Google Play Internal | |
| App Store Connect URL | |
| Google Play Console URL | |

**Phase 3 complete?** [ ]

---

## Phase 4: Beta Test

Client adds real content. Test everything on real devices.

### Beta Testing
- [ ] TestFlight link sent to client
- [ ] Google Play internal test link sent to client
- [ ] Client adding content (resources, training, posts)
- [ ] Push notifications tested (send from OneSignal dashboard)
- [ ] AI Chat tested with real product data
- [ ] Chat messaging tested
- [ ] All screens load correctly
- [ ] Offline downloads work
- [ ] Deep links work (email confirmation, password reset)

### Issues Found
| Issue | Status | Notes |
|-------|--------|-------|
| | | |

**Phase 4 complete?** [ ]

---

## Phase 5: Screenshots & Go Live

App has real content now. Take screenshots, finalize store listings, submit for production.

### Screenshots
- [ ] Copy `publish/screenshots.js` to `scripts/screenshots.js`, update credentials
- [ ] Start dev server: `PORT=3001 npm start`
- [ ] Run: `node scripts/screenshots.js` (both iOS + Android)
- [ ] Review screenshots, retake if needed
- [ ] iOS only: `node scripts/screenshots.js --ios`
- [ ] Android only: `node scripts/screenshots.js --android`

### Screenshot Outputs
| Device | Location |
|--------|----------|
| iPhone 6.5" | `screenshots/iPhone-6.5/` |
| iPad Pro | `screenshots/iPad-Pro/` |
| Android Phone | `screenshots/Android-Phone/` |
| Android 7" Tablet | `screenshots/Android-7-Tablet/` |
| Android 10" Tablet | `screenshots/Android-10-Tablet/` |

### Store Listing Content

**Promo Text** (max 170 chars):
>

Sample: `Your hub for [APP] resources, training, guides, IFUs, ordering tools, and real-time updates for field and clinical teams.`

**Keywords** (max 100 chars):
>

Sample: `[company], medical, sales tools, training, resources, clinical, field team, AI assistant`

**Full Description:**
>

Sample:
```
[APP NAME] is the official app for [COMPANY] team members.

Access everything you need in one place:

- Resource Library: Browse and download sales tools, product guides, and marketing materials organized by category
- Training Center: Access training videos, documents, and development resources
- AI Product Expert: Get instant answers about products from our AI-powered assistant
- Company Feed: Stay updated with posts, announcements, and team news
- Team Directory: Find and connect with colleagues
- Push Notifications: Never miss important updates
- Offline Downloads: Save resources for offline access
- Chat Messaging: Communicate directly with your team

Built for [COMPANY] employees, agents, and authorized personnel.

Privacy Policy: https://[SITE].netlify.app/privacy
Terms of Service: https://[SITE].netlify.app/terms
```

### Store URLs
| URL | Value |
|-----|-------|
| Privacy Policy | `https://[SITE].netlify.app/privacy` |
| Terms of Service | `https://[SITE].netlify.app/terms` |
| Support URL | `https://[SITE].netlify.app` |
| Marketing URL | (client website if they have one) |

### App Store (iOS) - Go Live
- [ ] Upload screenshots to App Store Connect
- [ ] Fill promo text, description, keywords
- [ ] Set privacy policy URL
- [ ] Set support URL
- [ ] Submit for review
- [ ] **Approved** [ ] Date: ___

### Google Play (Android) - Go Live
- [ ] Fill store listing (use publish/GOOGLE_PLAY_HANDOFF.md template)
- [ ] Upload screenshots
- [ ] Complete content rating questionnaire
- [ ] Complete data safety form
- [ ] Set privacy policy URL
- [ ] Upload production AAB (or promote from internal)
- [ ] Submit for review
- [ ] **Approved** [ ] Date: ___

### Final URLs
| Store | URL |
|-------|-----|
| App Store | |
| Google Play | |
| Web | |

**Phase 5 complete?** [ ]

---

## Post-Launch

- [ ] Connect to ConveyMed Analytics dashboard (see INSTRUCTIONS.md)
- [ ] Send store URLs to client
- [ ] Monitor for crashes/reviews first week

---

*DemoTemplate - App Duplication System*
