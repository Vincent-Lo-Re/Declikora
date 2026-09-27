import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être définies (voir .env.example)"
  )
}

// Typé avec le schéma de la base (npx supabase gen types typescript --local).
export const supabase = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey
)
