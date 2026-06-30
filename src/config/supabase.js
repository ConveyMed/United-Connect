import { createClient } from '@supabase/supabase-js';

// WHEN DUPLICATING THIS TEMPLATE: replace BOTH values below with the new app's OWN Supabase project credentials.
// Leaving the TODO placeholders causes the app to fail to connect, a loud failure by design, so you cannot
// silently point a new app at demo's database (or any other app's).
//
// Where to find these: Supabase dashboard -> Project Settings -> API -> Project URL and "anon public" key.
// They must match the project that powers THIS specific app.
//
// Also remember: src/analytics/config/apps.js needs its own matching swap. Both files use the same values.
export const supabaseUrl = 'https://wyeopzxtpywmauttizuy.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZW9wenh0cHl3bWF1dHRpenV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3ODAwODIsImV4cCI6MjA5ODM1NjA4Mn0.KwVM-3oKGoTcIhw7UW-8oz25O3GFeINkqE6uLvPohns';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
