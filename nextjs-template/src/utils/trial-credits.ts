import { createClient } from "@/utils/supabase/client"
import { RealtimeChannel } from '@supabase/supabase-js'

interface TrialCreditsSettings {
  trial_credits: number
  trial_credits_pricing_page: boolean
  enable_credits: boolean
}

let cachedSettings: TrialCreditsSettings | null = null
let realtimeSubscription: RealtimeChannel | null = null
type TrialCreditsChangeCallback = (settings: TrialCreditsSettings) => void
const subscribers = new Set<TrialCreditsChangeCallback>()

export const subscribeToTrialCreditsChanges = (callback: TrialCreditsChangeCallback) => {
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
          // When a change occurs, fetch the latest settings
          const newSettings = await getTrialCreditsSettings(true) // Pass true to force refresh
          subscribers.forEach(sub => sub(newSettings))
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

export const clearTrialCreditsCache = () => {
  cachedSettings = null
}

export const getTrialCreditsSettings = async (forceRefresh = false): Promise<TrialCreditsSettings> => {
  // Return cached value if available and not forcing refresh
  if (cachedSettings !== null && !forceRefresh) {
    return cachedSettings
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('website_settings')
      .select('trial_credits, trial_credits_pricing_page, enable_credits')
      .single()

    // If there's an error or no data, return defaults
    if (error || !data) {
      cachedSettings = { 
        trial_credits: 0, 
        trial_credits_pricing_page: false,
        enable_credits: false
      }
      return cachedSettings
    }

    // Store and return the settings
    cachedSettings = {
      trial_credits: data.trial_credits || 0,
      trial_credits_pricing_page: data.trial_credits_pricing_page || false,
      enable_credits: data.enable_credits || false
    }
    return cachedSettings
  } catch (error) {
    console.error('Error fetching trial credits settings:', error)
    cachedSettings = { 
      trial_credits: 0, 
      trial_credits_pricing_page: false,
      enable_credits: false
    }
    return cachedSettings
  }
} 