"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Loading from '@/components/ui/loading'
import { Copy, Trash2 } from "lucide-react"
import UserCredits from '@/components/UserCredits'
import { User } from '@supabase/supabase-js'

interface ApiKey {
  id: string
  api_key: string
  credits_used: number
}

interface Settings {
  enable_credits: boolean
  theme_colors?: {
    header: string
  } | string
}

interface ThemeColors {
  header: string
  dark: string
  primary: string
  secondary: string
  accent1: string
  accent2: string
  pageBackground: string
}

// Create Supabase client outside component
const supabase = createClient()

export default function ApiKeysPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [themeColors, setThemeColors] = useState<ThemeColors | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Authentication error:', authError)
          window.location.href = '/auth'
          return
        }
        
        if (!user) {
          // Redirect to auth page if not logged in
          window.location.href = '/auth'
          return
        }

        setUser(user)

        // Fetch website settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('website_settings')
          .select('enable_credits, theme_colors')
          .single()

        if (settingsError) {
          console.error('Error fetching settings:', settingsError)
          // Continue with null settings
        } else {
          setSettings(settingsData as Settings)
          
          // Parse theme colors
          if (settingsData.theme_colors) {
            try {
              const colors = typeof settingsData.theme_colors === 'string' 
                ? JSON.parse(settingsData.theme_colors) 
                : settingsData.theme_colors
              setThemeColors(colors)
            } catch (e) {
              console.error('Error parsing theme colors:', e)
            }
          }
        }

        // Fetch user's API keys
        const { data: keys, error: keysError } = await supabase
          .from('api_keys')
          .select('*')
          .eq('UID', user.id)
          .order('id', { ascending: false })

        if (keysError) {
          console.error('Error fetching API keys:', keysError)
        } else {
          setApiKeys(keys || [])
        }
      } catch (error) {
        console.error('Unexpected error during initialization:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, []) // Run only once on component mount

  const generateApiKey = async () => {
    try {
      setIsGenerating(true)
      
      if (!user) {
        console.error('You must be logged in to generate an API key')
        window.location.href = '/auth'
        return
      }
      
      // Generate a random API key following OpenAI's format
      const randomBytes = new Uint8Array(32)
      crypto.getRandomValues(randomBytes)
      const key = 'gv-' + Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 32)

      // Insert the new key into the database
      const { error } = await supabase
        .from('api_keys')
        .insert({
          UID: user.id,
          api_key: key,
          credits_used: 0
        })

      if (error) {
        console.error('Error creating API key:', error)
        return
      }

      // Refresh the list of keys
      const { data: keys, error: fetchError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('UID', user.id)
        .order('id', { ascending: false })

      if (fetchError) {
        console.error('Error fetching updated API keys:', fetchError)
      } else {
        setApiKeys(keys || [])
      }
    } catch (error) {
      console.error('Error generating API key:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting API key:', error)
        return
      }

      setApiKeys(apiKeys.filter(key => key.id !== id))
    } catch (error) {
      console.error('Error deleting API key:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
      })
      .catch(err => {
      })
  }

  // Calculate total credits used
  const totalCreditsUsed = apiKeys.reduce((total: number, key: ApiKey) => total + (key.credits_used || 0), 0)

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Credits Section */}
        {settings?.enable_credits && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="w-full md:w-auto px-6 py-4 border rounded-lg shadow-sm" 
              style={{ backgroundColor: themeColors?.header || '#FFFFFF' }}>
              <div className="text-sm text-muted-foreground mb-6">Total Credits Used</div>
              <div className="text-2xl font-bold text-center">{totalCreditsUsed.toLocaleString()}</div>
            </div>
            <div className="w-full md:w-auto">
              <UserCredits className="w-full" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex justify-end items-center">
              <Button 
                onClick={generateApiKey} 
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate New API Key'}
              </Button>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-6">
              {apiKeys.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No API keys found. Generate a new API key to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-2.5 border rounded-lg">
                      <div className="w-full mb-4 md:mb-0">
                        <div className="font-mono text-sm break-all">
                          {key.api_key}
                        </div>
                        {settings?.enable_credits && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Credits used: {key.credits_used.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(key.api_key)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteApiKey(key.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 