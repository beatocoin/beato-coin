"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import React, { useEffect, useState } from "react"
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function CustomNavButtons() {
  const [session, setSession] = useState<boolean>(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setSession(!!user)
      setUserId(user?.id || null)
      
      console.log('Current User ID:', user?.id || 'Not logged in')
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setSession(!!user)
        setUserId(user?.id || null)
        
        console.log('User ID (Auth State Change):', user?.id || 'Not logged in')
      }
      checkUser()
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="hidden md:flex gap-4">
      {session ? (
        <>
          <Button 
            className="bg-[var(--color-accent1)] text-white hover:bg-white hover:text-[var(--color-accent1)] hover:border-[var(--color-accent1)] border transition-colors w-28"
            onClick={() => userId && (window.location.href = `/dashboard?UID=${userId}`)}
          >
            Dashboard
          </Button>
          <Button 
            className="bg-[var(--color-accent2)] text-white hover:bg-white hover:text-[var(--color-accent2)] hover:border-[var(--color-accent2)] border transition-colors w-28" 
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </>
      ) : (
        <>
          <Button 
            className="bg-[var(--color-accent1)] text-white hover:bg-white hover:text-[var(--color-accent1)] hover:border-[var(--color-accent1)] border transition-colors w-28"
            onClick={() => window.location.href = '/auth'}
          >
            Log In
          </Button>
          <Button 
            className="bg-[var(--color-accent2)] text-white hover:bg-white hover:text-[var(--color-accent2)] hover:border-[var(--color-accent2)] border transition-colors w-28"
            onClick={() => window.location.href = '/auth?tab=register'}
          >
            Register
          </Button>
        </>
      )}
    </div>
  )
} 