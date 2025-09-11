"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Loading from "@/components/ui/loading"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/ThemeContext"
import * as Icons from 'lucide-react'
import Link from "next/link"

// Simple type assertions to fix build issues with Next.js 15.2.1
const LoadingComponent = Loading as any
const CardComponent = Card as any
const CardHeaderComponent = CardHeader as any
const CardTitleComponent = CardTitle as any
const CardContentComponent = CardContent as any
const ButtonComponent = Button as any
const LinkComponent = Link as any

interface WebsiteSettings {
  theme_colors?: {
    primary: string
    secondary: string
    dark: string
    accent1: string
    accent2: string
  }
}

interface Agent {
  id: string
  name: string
  description: string
  config: {
    options: {
      icon: string
    }
  }
}

export default function AgentsPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<WebsiteSettings | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { colors } = useTheme()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check login status
        const { data: { user } } = await supabase.auth.getUser()
        setIsLoggedIn(!!user)

        // Get website settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('website_settings')
          .select('theme_colors')
          .single()

        if (settingsError) {
          console.error('Error fetching settings:', settingsError)
        } else {
          setSettings(settingsData)
        }

        // Fetch public agents
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('*')
          .eq('is_public', true)

        if (agentsError) {
          console.error('Error fetching agents:', agentsError)
        } else {
          setAgents(agentsData || [])
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  if (isLoading) {
    return <LoadingComponent />
  }

  // Function to get the icon component
  const getIconComponent = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.FC<any>
    return IconComponent || Icons.Bot
  }

  // Array of colors to alternate between
  const cardColors = [colors.primary, colors.accent1, colors.accent2]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center space-y-6">
        <div className="w-full max-w-[1200px]">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, index) => {
              const IconComponent = getIconComponent(agent.config?.options?.icon || 'Bot')
              
              // Calculate which row this card belongs to based on grid columns
              // On mobile: 1 column, tablet: 2 columns, desktop: 3 columns
              // We'll use the desktop layout (3 columns) as our baseline
              const rowIndex = Math.floor(index / 3)
              
              // Reverse color order for odd rows (0-indexed, so row 1, 3, 5, etc.)
              const shouldReverseColors = rowIndex % 2 === 1
              
              // Get the effective index for selecting color
              const colorIndex = index % cardColors.length
              
              // Select color based on whether this row has reversed colors
              const cardColor = shouldReverseColors 
                ? cardColors[cardColors.length - 1 - colorIndex]  // Reversed order
                : cardColors[colorIndex]                          // Normal order

              return (
                <CardComponent 
                  key={agent.id} 
                  className="w-full h-full overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col" 
                  style={{ borderTop: `4px solid ${cardColor}` }}
                >
                  <CardHeaderComponent>
                    <div className="flex justify-between items-center">
                      <CardTitleComponent className="flex items-center">
                        <div className="rounded-full p-2 mr-3" style={{ backgroundColor: cardColor }}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        {agent.name}
                      </CardTitleComponent>
                    </div>
                  </CardHeaderComponent>
                  <CardContentComponent className="flex flex-col flex-1">
                    <p className="text-muted-foreground mb-6">{agent.description}</p>
                    <div className="mt-auto">
                      <LinkComponent href={isLoggedIn ? `/agent?agent_id=${agent.id}` : '/auth'} className="w-full block">
                        <ButtonComponent 
                          className="w-full"
                          style={{ 
                            backgroundColor: cardColor,
                            color: 'white',
                            border: 'none'
                          }}
                        >
                          {isLoggedIn ? 'Use Agent' : 'Create Free Account'}
                        </ButtonComponent>
                      </LinkComponent>
                      {!isLoggedIn && (
                        <p className="text-center text-sm text-muted-foreground mt-2">
                          Please Login or Create a Free Account to use this agent.
                        </p>
                      )}
                    </div>
                  </CardContentComponent>
                </CardComponent>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
} 