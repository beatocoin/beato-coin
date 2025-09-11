"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Loading from "@/components/ui/loading"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { User, PostgrestError } from '@supabase/supabase-js'

// Simple type assertions to fix build issues with Next.js 15.2.1
const LoadingComponent = Loading as any
const CardComponent = Card as any
const CardHeaderComponent = CardHeader as any
const CardTitleComponent = CardTitle as any
const CardContentComponent = CardContent as any
const ButtonComponent = Button as any
const LinkComponent = Link as any
const TableComponent = Table as any
const TableHeaderComponent = TableHeader as any
const TableRowComponent = TableRow as any
const TableHeadComponent = TableHead as any
const TableBodyComponent = TableBody as any
const TableCellComponent = TableCell as any

interface StripeSubscription {
  status: string;
  name?: string;
  price?: string;
  interval?: string;
  last_payment?: string;
  transaction_id?: string;
  [key: string]: any;
}

interface UserData {
  UID: string;
  user_role: string;
  display_name: string | null;
  email: string | null;
  credits: number;
  created_at: string;
  stripe_id: StripeSubscription[];
}

interface WebsiteSettings {
  database_url: string;
  database_anon_key: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
}

export default function SubscriptionsPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasWebsiteSettings, setHasWebsiteSettings] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

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
          window.location.href = '/auth'
          return
        }

        setCurrentUser(user)

        // Check if user has admin role
        const { data: userData, error: dbError } = await supabase
          .from('user_data')
          .select('user_role')
          .eq('UID', user.id)
          .single()

        if (dbError) {
          console.error('Database error:', dbError)
          window.location.href = '/dashboard'
          return
        }
        
        if (userData?.user_role !== 'admin') {
          window.location.href = '/dashboard'
          return
        }

        // Check if website_settings table exists and is configured
        const { data: websiteSettings, error: settingsError } = await supabase
          .from('website_settings')
          .select('stripe_publishable_key, stripe_secret_key, stripe_webhook_secret')
          .single()

        if (settingsError || !websiteSettings?.stripe_publishable_key ||
            !websiteSettings?.stripe_secret_key || !websiteSettings?.stripe_webhook_secret) {
          setHasWebsiteSettings(false)
          setIsLoading(false)
          return
        }

        setHasWebsiteSettings(true)

        // Fetch all users
        const { data: usersData, error: usersError } = await supabase
          .from('user_data')
          .select('*')
          .order('created_at', { ascending: false })

        if (usersError) {
          console.error('Error fetching users:', usersError)
          setError('Failed to load users')
        } else {
          setUsers(usersData || [])
        }

        setIsLoading(false)
      } catch (error: unknown) {
        console.error('Unexpected error:', error)
        setError('An unexpected error occurred')
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [supabase]) // Removed router from dependency array

  if (isLoading) {
    return <LoadingComponent />
  }

  if (error === 'setup_required') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-6">Website Setup Required</h1>
        <p className="mb-8 text-lg">
          Please complete Steps 1, 2, 3 and 4 on the <LinkComponent href="/website-setup" className="text-blue-500 hover:text-blue-600 underline">Website Setup</LinkComponent> Page to view and start creating Subscription Products.
        </p>
        <ButtonComponent asChild>
          <LinkComponent href="/website-setup">
            Website Setup
          </LinkComponent>
        </ButtonComponent>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <CardComponent className="w-full text-center">
          <CardHeaderComponent>
            <CardTitleComponent>Error</CardTitleComponent>
          </CardHeaderComponent>
          <CardContentComponent>
            <p className="text-muted-foreground">{error}</p>
          </CardContentComponent>
        </CardComponent>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">User Subscriptions</h1>
      <CardComponent>
        <CardContentComponent className="p-0">
          <TableComponent>
            <TableHeaderComponent>
              <TableRowComponent>
                <TableHeadComponent>Name</TableHeadComponent>
                <TableHeadComponent>Email</TableHeadComponent>
                <TableHeadComponent>Role</TableHeadComponent>
                <TableHeadComponent>Credits</TableHeadComponent>
                <TableHeadComponent>Subscription Status</TableHeadComponent>
                <TableHeadComponent>Created At</TableHeadComponent>
              </TableRowComponent>
            </TableHeaderComponent>
            <TableBodyComponent>
              {users.map((user) => (
                <TableRowComponent key={user.UID}>
                  <TableCellComponent>{user.display_name || 'N/A'}</TableCellComponent>
                  <TableCellComponent>{user.email || 'N/A'}</TableCellComponent>
                  <TableCellComponent>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.user_role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : user.user_role === 'premium' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.user_role.charAt(0).toUpperCase() + user.user_role.slice(1)}
                    </span>
                  </TableCellComponent>
                  <TableCellComponent>{user.credits}</TableCellComponent>
                  <TableCellComponent>
                    {user.stripe_id && user.stripe_id.length > 0 ? (
                      <div className="space-y-1">
                        {user.stripe_id.map((subscription, index) => (
                          <div key={index} className="flex items-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              subscription.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : subscription.status === 'canceled' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No subscription</span>
                    )}
                  </TableCellComponent>
                  <TableCellComponent>{new Date(user.created_at).toLocaleDateString()}</TableCellComponent>
                </TableRowComponent>
              ))}
            </TableBodyComponent>
          </TableComponent>
        </CardContentComponent>
      </CardComponent>
    </div>
  )
} 