# Field Intel — Provisioned Day 1, Dark by Default

Field Intel (the medical-sales CRM-lite zone: surgeon/account directory, role hierarchy,
delegations, call logs, AI dossiers, Deal Review + export, call-log push) is **baked into
this template**. Every duplicated app gets it on day 1 — full code, full schema, edge
functions — but the **frontend is dark** and nobody can reach it until a developer turns it on.

This means: when a client buys Field Intel later, activating it is normally a **pure frontend
change** (flip one flag), because the database was already provisioned at app creation. No
risky migration against a live client database.

---

## The switch

`src/config/features.js`:

```js
export const ENABLE_FIELD_INTEL = false;   // dark by default
```

Flip to `true` and the entire surface lights up in one move:
- the **bottom-nav "Field Intel"** item (with unread badge)
- the `/field-intel` route tree + its providers (`FieldIntelProvider`, `FieldIntelNotificationsProvider`)
- the **"Field Intel" section** in Notification Settings (call-log push: off / daily summary / per-log)

It is intentionally **NOT** an owner / `app_settings` toggle. Owners cannot see or enable it.
Only a developer flips this in code.

> Note: the intel code (incl. ExcelJS for export) is statically imported, so it ships in the
> JS bundle even while dark. That's the accepted trade for "provisioned and one-flip-ready."
> If a dormant app needs a leaner bundle, the intel route subtree can be switched to a
> lazy-loaded chunk later — not required for correctness.

---

## What ships on day 1 (every duplication)

**Frontend** — `src/field-intel/` (full module) + `src/context/FieldIntelNotificationsContext.js`,
all wired into `src/App.js`, `src/components/BottomNav.js`, and `src/pages/NotificationSettings.js`
behind `ENABLE_FIELD_INTEL`.

**Database** — `supabase/field_intelligence.sql` is a single consolidated, idempotent bundle
(tables, RLS, functions, triggers, RPCs, the call-log read-state table, CPT pricing, physician
profiles, the daily-summary cron). Run it as part of the normal SQL setup, **after**
`users.sql`, `app_settings.sql`, and `notification_preferences.sql` (it ALTERs those).
See the header of that file for prerequisites and any per-project placeholders (the pg_cron
daily-summary job needs pg_cron + pg_net enabled and may need this project's URL/service-role).

**Edge functions** — deploy with the rest:
- `physician-research` (AI dossiers; needs the AI key secret, e.g. `GEMINI_API_KEY`)
- `send-call-log-push` (per-log push; OneSignal secrets)
- `send-daily-summary-push` (8 AM digest; OneSignal secrets; driven by the pg_cron job)

All three read project secrets from Edge Function settings — no demo values are hardcoded.

---

## Activating Field Intel for a client (the upgrade path)

1. Confirm the app's Supabase already has the `field_intelligence.sql` bundle applied (it
   should, from day-1 setup) and the 3 intel edge functions deployed. If an older app predates
   this, apply the bundle + deploy the functions now.
2. Enable **pg_cron** + **pg_net** extensions if the daily-summary push is wanted, and verify
   the cron job's URL/service-role placeholder is set for this project.
3. Set `ENABLE_FIELD_INTEL = true` in `src/config/features.js`.
4. As an admin, build the org: import the account CSV, create regions, build the hierarchy
   (org chart), delegate accounts. Roles (`rep`/`manager`/`vp`) come from `hierarchy_assignments`.
5. Build + deploy. The bottom-nav item, the zone, and the notification section are now live.
