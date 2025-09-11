import { createClient } from '@supabase/supabase-js'

interface SupabaseConfig {
  supabaseUrl: string
  supabaseAnonKey: string
}

let cachedConfig: SupabaseConfig | null = null

export async function getSupabaseConfig(): Promise<SupabaseConfig> {
  // If we have cached config, return it
  if (cachedConfig) {
    return cachedConfig
  }

  // Try to get config from the default client first
  const defaultClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Use environment variables
  cachedConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  }

  return cachedConfig
}

// Function to clear the cached config (useful when settings are updated)
export function clearSupabaseConfigCache() {
  cachedConfig = null
} 