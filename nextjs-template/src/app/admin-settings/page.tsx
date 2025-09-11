"use client"

import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import Loading from "@/components/ui/loading"
import SettingsForm from "@/components/SettingsForm"
import PageSettingsForm from "@/components/PageSettingsForm"
import { User } from '@supabase/supabase-js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface UserData {
  user_role?: string;
  UID?: string;
}

export default function AdminSettingsPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("primary")

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Authentication error:', authError)
          setError('Authentication failed')
          setIsLoading(false)
          return
        }
        
        if (!user) {
          // Instead of redirecting, just return
          setIsLoading(false)
          return
        }

        setUser(user)

        // Check if user has admin role
        const { data: userData, error: dbError } = await supabase
          .from('user_data')
          .select('user_role')
          .eq('UID', user.id)
          .single()

        if (dbError) {
          console.error('Database error:', dbError)
          setError('Failed to fetch user data')
          setIsLoading(false)
          return
        }

        if (userData?.user_role !== 'admin') {
          // Instead of redirecting, just return
          setIsLoading(false)
          return
        }

        setIsAdmin(true)
        setIsLoading(false)
      } catch (error: unknown) {
        console.error('Unexpected error:', error)
        setError('An unexpected error occurred')
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [supabase])

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-800">Error</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold mb-4 text-yellow-800">Access Restricted</h1>
          <p className="text-yellow-700">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="primary">Primary Settings</TabsTrigger>
          <TabsTrigger value="pages">Page Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="primary">
          <SettingsForm />
        </TabsContent>
        <TabsContent value="pages">
          <PageSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  )
} 