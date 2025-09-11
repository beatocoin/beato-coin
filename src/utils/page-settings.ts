import { createClient } from "@/utils/supabase/client"

interface PageSettings {
  agents: {
    title: string
    link_text: string
    description: string
  }
  pricing: {
    title: string
    link_text: string
    description: string
  }
}

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  agents: {
    title: "AI Agents",
    link_text: "AI Agents",
    description: "Our specialized AI agents can help you with various tasks. Select an agent to get started."
  },
  pricing: {
    title: "Plans & Pricing",
    link_text: "Plans & Pricing",
    description: "We have plans to fit all business needs."
  }
}

let cachedPageSettings: PageSettings | null = null

export const clearPageSettingsCache = () => {
  cachedPageSettings = null
}

export const getPageSettings = async (): Promise<PageSettings> => {
  if (cachedPageSettings) {
    return cachedPageSettings
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('website_settings')
      .select('page_settings')
      .single()

    if (error) {
      console.error('Error fetching page settings:', error)
      cachedPageSettings = DEFAULT_PAGE_SETTINGS
      return DEFAULT_PAGE_SETTINGS
    }

    if (!data?.page_settings) {
      cachedPageSettings = DEFAULT_PAGE_SETTINGS
      return DEFAULT_PAGE_SETTINGS
    }

    // Merge with default settings to ensure all fields exist
    cachedPageSettings = {
      agents: {
        ...DEFAULT_PAGE_SETTINGS.agents,
        ...data.page_settings.agents
      },
      pricing: {
        ...DEFAULT_PAGE_SETTINGS.pricing,
        ...data.page_settings.pricing
      }
    }

    return cachedPageSettings
  } catch (error) {
    console.error('Error in getPageSettings:', error)
    cachedPageSettings = DEFAULT_PAGE_SETTINGS
    return DEFAULT_PAGE_SETTINGS
  }
} 