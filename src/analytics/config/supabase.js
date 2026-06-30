import { createClient } from '@supabase/supabase-js'

const clients = {}

export function getSupabaseClient(url, key) {
  if (!clients[url]) {
    // Extract project ref from URL for unique storage key
    const ref = url.replace('https://', '').split('.')[0]
    clients[url] = createClient(url, key, {
      auth: { storageKey: `sb-${ref}-auth-token` }
    })
  }
  return clients[url]
}
