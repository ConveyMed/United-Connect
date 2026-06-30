// ============================================================================
// Field Intel feature flag
// ============================================================================
// Field Intel ships fully provisioned on day 1 of every duplicated app:
//   - the full src/field-intel/ module lives in the repo
//   - the field_intelligence SQL bundle is part of the standard DB setup
//   - the 3 intel edge functions are deployed with the rest
// ...but the FRONTEND is DARK by default. Nothing links to it, it's not in the
// bottom nav, and it is intentionally NOT an owner / app_settings toggle. Only a
// developer flips this switch in code when a client actually buys Field Intel.
//
// Flipping ENABLE_FIELD_INTEL to true lights up the entire surface in one move:
//   - bottom-nav "Field Intel" item (with unread badge)
//   - the /field-intel route tree + its providers
//   - the "Field Intel" section in Notification Settings
//
// Before enabling for a live app, confirm its Supabase has the field_intelligence
// schema applied and the intel edge functions deployed (see DUPLICATION_GUIDE.md
// and supabase/RUN_ORDER). The schema is provisioned day 1, so enabling is normally
// a pure-frontend change with no live DB migration.
export const ENABLE_FIELD_INTEL = false;
