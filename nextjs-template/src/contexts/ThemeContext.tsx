'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Loading from '@/components/ui/loading'

interface ThemeColors {
  primary: string
  secondary: string
  dark: string
  accent1: string
  accent2: string
  header: string
  pageBackground: string
}

interface ThemeContextType {
  colors: ThemeColors
  setColors: (colors: ThemeColors) => void
  tableExists: boolean
}

const defaultColors: ThemeColors = {
  primary: '#005b80',
  secondary: '#F8FDFF',
  dark: '#233D4D',
  accent1: '#00a4e6',
  accent2: '#f2a700',
  header: '#FFFFFF',
  pageBackground: '#F8FDFF'
}

const ThemeContext = createContext<ThemeContextType>({
  colors: defaultColors,
  setColors: () => {},
  tableExists: false
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(defaultColors)
  const [isLoading, setIsLoading] = useState(true)
  const [tableExists, setTableExists] = useState(false)

  useEffect(() => {
    const loadThemeColors = async () => {
      const supabase = createClient()
      try {
        // First check if the website_settings table exists by checking row count
        // This avoids using select count(*) which can trigger a 500 error with RLS
        const { data: countData, error: countError } = await supabase
          .from('website_settings')
          .select('id', { count: 'exact', head: true })

        if (countError) {
          console.log('Error checking if table exists:', countError)
          setTableExists(false)
          setIsLoading(false)
          return
        }

        // If we get here, table exists
        setTableExists(true)
          
        // Now try to get the theme colors
        const { data, error } = await supabase
          .from('website_settings')
          .select('theme_colors')
          .maybeSingle() // Use maybeSingle instead of single to avoid error if no row

        if (error) {
          console.error('Error fetching theme colors:', error)
          // Still use default colors in case of error
          setColors(defaultColors)
        } else if (data?.theme_colors) {
          console.log('Theme colors loaded successfully')
          setColors(data.theme_colors)
        } else {
          console.log('No theme_colors found in website_settings, using default')
          // No theme colors found, use default
          setColors(defaultColors)
        }
      } catch (error) {
        // Generic error handling
        console.error('Unexpected error in ThemeContext:', error)
        setColors(defaultColors)
        setTableExists(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadThemeColors()
  }, [])

  useEffect(() => {
    // Update CSS variables when colors change
    const root = document.documentElement
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })

    // Apply header and page background colors directly
    const header = document.querySelector('header')
    if (header) {
      header.style.backgroundColor = colors.header
    }
    document.body.style.backgroundColor = colors.pageBackground
  }, [colors])

  if (isLoading) {
    return <Loading size="sm" />
  }

  return (
    <ThemeContext.Provider value={{ colors, setColors, tableExists }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext) 