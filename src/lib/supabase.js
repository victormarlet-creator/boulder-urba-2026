import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Falten les variables VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY al fitxer .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
