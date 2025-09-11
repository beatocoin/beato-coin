import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card } from '@/components/ui/card'
import { Coins } from 'lucide-react'
import { RealtimeChannel } from '@supabase/supabase-js'

interface ThemeColors {
  dark: string
  header: string
  accent1: string
  accent2: string
  primary: string
  secondary: string
  pageBackground: string
}

interface UserCreditsProps {
  className?: string
  showLabel?: boolean
}

export default function UserCredits({ className = '', showLabel = true }: UserCreditsProps) {
  const supabase = createClient()
  const [credits, setCredits] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [themeColors, setThemeColors] = useState<ThemeColors | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        // Try to get theme colors from localStorage first
        const cachedColors = localStorage.getItem('themeColors')
        let colors: ThemeColors | null = null

        if (cachedColors) {
          colors = JSON.parse(cachedColors)
          setThemeColors(colors)
        } else {
          // If not in cache, fetch from database
          const { data: settings, error: settingsError } = await supabase
            .from('website_settings')
            .select('theme_colors')
            .single()

          if (!settingsError && settings?.theme_colors) {
            colors = typeof settings.theme_colors === 'string' 
              ? JSON.parse(settings.theme_colors) 
              : settings.theme_colors
            
            // Cache the theme colors
            localStorage.setItem('themeColors', JSON.stringify(colors))
            setThemeColors(colors)
          }
        }

        // Get user's credits
        const { data: userData, error } = await supabase
          .from('user_data')
          .select('credits')
          .eq('UID', user.id)
          .single()

        if (error) {
          console.error('Error fetching credits:', error)
          return
        }

        setCredits(userData?.credits || 0)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Subscribe to realtime changes
    const subscribeToChanges = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel('user_credits')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_data',
            filter: `UID=eq.${user.id}`
          },
          (payload) => {
            setCredits(payload.new.credits || 0)
          }
        )
        .subscribe()

      // Also subscribe to theme color changes
      const settingsChannel = supabase
        .channel('theme_colors')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'website_settings'
          },
          async (payload) => {
            if (payload.new.theme_colors) {
              const colors = typeof payload.new.theme_colors === 'string'
                ? JSON.parse(payload.new.theme_colors)
                : payload.new.theme_colors
              
              localStorage.setItem('themeColors', JSON.stringify(colors))
              setThemeColors(colors)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
        supabase.removeChannel(settingsChannel)
      }
    }

    const unsubscribe = subscribeToChanges()
    return () => {
      unsubscribe.then(cleanup => cleanup?.())
    }
  }, [supabase])

  if (isLoading || credits === null || !themeColors) {
    return null
  }

  return (
    <Card 
      className={`inline-flex items-center gap-2 px-4 py-3 text-white shadow-lg ${className}`}
      style={{
        background: '#2a2f2f'
      }}
    >
      <Coins className="h-6 w-6" style={{ filter: 'drop-shadow(2px 2px 2px #333)' }} />
      <div className="flex flex-col" style={{ textShadow: '2px 2px 2px #333' }}>
        {showLabel && (
          <span className="text-sm font-medium opacity-90">Available Credits</span>
        )}
        <span className="text-2xl font-bold">{credits.toLocaleString()}</span>
      </div>
    </Card>
  )
} 