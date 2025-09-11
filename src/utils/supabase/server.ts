import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create a function that works with both async and sync usage
// @ts-ignore - Ignore the redeclaration error from the .d.ts file
export const createClient = async () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => {
          const cookiesStore = await cookies();
          return cookiesStore.get(name)?.value;
        },
        set: async (name: string, value: string, options: CookieOptions) => {
          try {
            const cookiesStore = await cookies();
            cookiesStore.set({ name, value, ...options });
          } catch (error) {
            console.error('Error setting cookie:', error);
          }
        },
        remove: async (name: string, options: CookieOptions) => {
          try {
            const cookiesStore = await cookies();
            cookiesStore.delete({ name, ...options });
          } catch (error) {
            console.error('Error deleting cookie:', error);
          }
        },
      },
    }
  )
} 