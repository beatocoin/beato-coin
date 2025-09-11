"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Loading from "@/components/ui/loading"
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"

// Simple type assertions to fix build issues with Next.js 15.2.1
const CardComponent = Card as any
const CardHeaderComponent = CardHeader as any
const CardTitleComponent = CardTitle as any
const CardContentComponent = CardContent as any
const ButtonComponent = Button as any
const LoadingComponent = Loading as any
const PlusIconComponent = PlusIcon as any

// Define the Agent interface based on the table schema
interface Agent {
  id: string
  name: string
  description: string
  api_url: string
  is_public: boolean
  created_at: string
  updated_at: string
  UID: string
  prompt: string | null
  agent_role: string | null
  config: Record<string, any> | null
}

// Create Supabase client outside component to avoid dependency issues
const supabase = createClient()

export default function MyAgentsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [agents, setAgents] = useState<Agent[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const { colors } = useTheme()

  useEffect(() => {
    const loadData = async () => {
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
        setUserId(user.id)

        // Get agents owned by the current user
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('*')
          .eq('UID', user.id)
          .order('created_at', { ascending: false })

        if (agentsError) {
          console.error('Error fetching agents:', agentsError)
          return
        }

        setAgents(agentsData || [])
      } catch (error) {
        console.error('Error loading agent data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, []) // Run only once on component mount

  if (isLoading) {
    return <LoadingComponent />
  }

  // Custom button styles using theme colors
  const viewButtonStyle = {
    backgroundColor: colors.accent2,
    color: 'white',
    border: 'none'
  }

  const editButtonStyle = {
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none'
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Agents</h1>
        <Link href="/create-agent">
          <ButtonComponent>
            <PlusIconComponent className="mr-2 h-4 w-4" />
            Create New Agent
          </ButtonComponent>
        </Link>
      </div>
      
      {/* Agents Table */}
      <CardComponent>
        <CardHeaderComponent>
          <CardTitleComponent>Your AI Agents</CardTitleComponent>
        </CardHeaderComponent>
        <CardContentComponent>
          {agents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You haven&apos;t created any agents yet.</p>
              <Link href="/create-agent">
                <ButtonComponent className="mt-4">
                  <PlusIconComponent className="mr-2 h-4 w-4" />
                  Create Your First Agent
                </ButtonComponent>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-2 py-3">Name</th>
                    <th scope="col" className="px-2 py-3">Description</th>
                    <th scope="col" className="px-2 py-3">API URL</th>
                    <th scope="col" className="px-2 py-3">Public</th>
                    <th scope="col" className="px-2 py-3 w-[15%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                      <td className="px-2 py-4">{agent.name}</td>
                      <td className="px-2 py-4">{agent.description}</td>
                      <td className="px-2 py-4 text-[0.675rem] leading-4">{agent.api_url || 'Not configured'}</td>
                      <td className="px-2 py-4">{agent.is_public ? 'Yes' : 'No'}</td>
                      <td className="px-2 py-4 w-[15%]">
                        <Link href={`/agent?agent_id=${agent.id}`}>
                          <ButtonComponent 
                            variant="outline" 
                            size="sm" 
                            className="mr-2 text-white" 
                            style={viewButtonStyle}
                          >
                            View
                          </ButtonComponent>
                        </Link>
                        <Link href={`/edit-agent?agent_id=${agent.id}`}>
                          <ButtonComponent 
                            variant="outline" 
                            size="sm"
                            className="text-white"
                            style={editButtonStyle}
                          >
                            Edit
                          </ButtonComponent>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContentComponent>
      </CardComponent>
    </div>
  )
} 