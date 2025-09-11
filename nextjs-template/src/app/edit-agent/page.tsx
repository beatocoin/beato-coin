"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import AgentForm from "@/components/AgentForm"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Loading from "@/components/ui/loading"

// Simple type assertions to fix build issues with Next.js 15.2.1
const LinkComponent = Link as any
const ButtonComponent = Button as any
const CardComponent = Card as any
const LoadingComponent = Loading as any

// Define Agent interface
interface Agent {
  id: string
  name: string
  description: string
  api_url: string | null
  prompt: string | null
  agent_role: string | null
  is_public: boolean
  config: Record<string, any> | null
}

export default function EditAgentPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)

  useEffect(() => {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search)
    const id = params.get('agent_id')
    setAgentId(id)
    
    const checkUserAndLoadAgent = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          window.location.href = '/auth'
          return
        }

        if (!id) {
          setError('No agent ID provided. Please select an agent to edit.')
          setIsLoading(false)
          return
        }

        // Load agent data
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('id', id)
          .eq('UID', user.id) // Ensure the agent belongs to the user
          .single()

        if (agentError) {
          console.error('Error loading agent:', agentError)
          setError('Failed to load agent data. You might not have permission to edit this agent.')
          setIsLoading(false)
          return
        }

        setAgent(agentData)
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    checkUserAndLoadAgent()
  }, [supabase])

  if (isLoading) {
    return <LoadingComponent />
  }

  if (error || !agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <CardComponent className="w-full max-w-2xl text-center p-6">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-sm text-muted-foreground mb-4">{error || 'Agent not found'}</p>
          <ButtonComponent asChild>
            <LinkComponent href="/my-agents">Back to My Agents</LinkComponent>
          </ButtonComponent>
        </CardComponent>
      </div>
    )
  }

  return (
    <div>
      <AgentForm
        mode="edit"
        initialData={agent}
      />
    </div>
  )
} 