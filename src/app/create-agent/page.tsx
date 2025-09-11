"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
// Check if we're being used as a submodule
const isSubmodule = typeof window !== 'undefined' && window.location.pathname.includes('/submodule/')
const AgentForm = isSubmodule 
  ? require('@submodule/components/AgentForm').default 
  : require('@/components/AgentForm').default
const { Card } = isSubmodule 
  ? require('@submodule/components/ui/card') 
  : require('@/components/ui/card')
const { Button } = isSubmodule 
  ? require('@submodule/components/ui/button') 
  : require('@/components/ui/button')
import Link from "next/link"

// Simple type assertions to fix build issues with Next.js 15.2.1
const LinkComponent = Link as any
const ButtonComponent = Button as any
const CardComponent = Card as any

export default function CreateAgentPage() {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          window.location.href = '/auth'
          return
        }
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      }
    }

    checkUser()
  }, [supabase])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <CardComponent className="w-full max-w-2xl text-center p-6">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <ButtonComponent asChild>
            <LinkComponent href="/my-agents">Back to My Agents</LinkComponent>
          </ButtonComponent>
        </CardComponent>
      </div>
    )
  }

  return (
    <div>
      <AgentForm mode="create" />
    </div>
  )
} 