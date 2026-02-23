import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Copy .env.example to .env and fill in your project URL and anon key.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Persist auth session in localStorage so it survives page reloads
    persistSession: true,
    autoRefreshToken: true,
  },
  // Realtime is not needed in the initial build; disable to save resources
  realtime: { params: { eventsPerSecond: 0 } },
})

export const FARM_ID = import.meta.env.VITE_FARM_ID
