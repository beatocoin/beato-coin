import { createBrowserClient } from '@supabase/ssr'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

// Initialize the client immediately with environment variables
const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Set up auth state change listener only on the client side
if (typeof window !== 'undefined') {
  supabaseClient.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    // Don't redirect if we're on the website-setup page
    if (window.location.pathname === '/website-setup') {
      return
    }
    // Redirect to /wallet on sign in or sign up, but only if on /auth
    if ((event === 'SIGNED_IN') && window.location.pathname === '/auth') {
      window.location.href = '/wallet';
      return;
    }
  })
}

// Export both the default client and a function to create a new client
export default supabaseClient
export const createClient = () => supabaseClient

// This function will be used when we implement the settings update
export async function updateClient(url: string, key: string) {
  return createBrowserClient(url, key)
} 