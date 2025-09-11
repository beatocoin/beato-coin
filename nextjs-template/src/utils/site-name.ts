import { createClient } from "@/utils/supabase/client"
import { RealtimeChannel } from '@supabase/supabase-js'

export const DEFAULT_SITE_NAME = "NextJS Boilerplate"
let cachedSiteName: string | null = null
let realtimeSubscription: RealtimeChannel | null = null
type SiteNameChangeCallback = (newName: string) => void
const subscribers = new Set<SiteNameChangeCallback>()

export const subscribeToSiteNameChanges = (callback: SiteNameChangeCallback) => {
  subscribers.add(callback)

  // Set up realtime subscription if not already done
  if (!realtimeSubscription) {
    const supabase = createClient()
    realtimeSubscription = supabase
      .channel('website_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'website_settings'
        },
        async () => {
          // When a change occurs, fetch the latest site name
          const newName = await getSiteName(true) // Pass true to force refresh
          subscribers.forEach(sub => sub(newName))
        }
      )
      .subscribe()
  }

  // Return unsubscribe function
  return () => {
    subscribers.delete(callback)
    
    // If no more subscribers, clean up the realtime subscription
    if (subscribers.size === 0 && realtimeSubscription) {
      realtimeSubscription.unsubscribe()
      realtimeSubscription = null
    }
  }
}

export const clearSiteNameCache = () => {
  cachedSiteName = null
}

export const getSiteName = async (forceRefresh = false): Promise<string> => {
  // Return cached value if available and not forcing refresh
  if (cachedSiteName !== null && !forceRefresh) {
    return cachedSiteName
  }

  const supabase = createClient()

  try {
    // Use maybeSingle instead of single to avoid errors when no row exists
    const { data, error } = await supabase
      .from('website_settings')
      .select('site_name')
      .maybeSingle()

    // If there's an error, log it and return default
    if (error) {
      console.error('Error fetching site name:', error)
      cachedSiteName = DEFAULT_SITE_NAME
      return DEFAULT_SITE_NAME
    }

    // If no data or no site_name, return default
    if (!data || !data.site_name) {
      console.log('No site name found, using default')
      cachedSiteName = DEFAULT_SITE_NAME
      return DEFAULT_SITE_NAME
    }

    // Store and return the site name
    console.log('Site name loaded successfully:', data.site_name)
    cachedSiteName = data.site_name
    return data.site_name
  } catch (error) {
    console.error('Unexpected error fetching site name:', error)
    cachedSiteName = DEFAULT_SITE_NAME
    return DEFAULT_SITE_NAME
  }
} 