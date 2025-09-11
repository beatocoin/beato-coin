"use client"

import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Loading from "@/components/ui/loading"
import { RealtimeChannel, User, PostgrestError } from '@supabase/supabase-js'
import UserCredits from '@/components/UserCredits'
import { toast } from "@/utils/toast"
import { TransactionPayload } from '@/types/supabase'

interface WebsiteSettings {
  enable_credits: boolean;
  trial_credits: number;
  trial_credits_pricing_page: boolean;
}

interface Transaction {
  id: string;
  name: string;
  price: string;
  status: string;
  event_id: string;
  interval: string;
  last_payment: string;
  transaction_id: string;
  UID?: string;
}

interface PortalResponse {
  url: string;
  error?: string;
}

// Create Supabase client outside component to avoid dependency issues
const supabase = createClient()

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [settings, setSettings] = useState<WebsiteSettings | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null)

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json() as PortalResponse;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      window.location.href = data.url;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open subscription management portal';
      console.error('Error creating portal session:', error);
      toast.error(errorMessage);
    }
  }

  const parseTransactions = (data: unknown): Transaction[] => {
    try {
      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map((item: Record<string, unknown>) => ({
        id: typeof item.id === 'string' ? item.id : '',
        name: typeof item.name === 'string' ? item.name : '',
        price: typeof item.price === 'string' ? item.price : '',
        status: typeof item.status === 'string' ? item.status : '',
        event_id: typeof item.event_id === 'string' ? item.event_id : '',
        interval: typeof item.interval === 'string' ? item.interval : '',
        last_payment: typeof item.last_payment === 'string' ? item.last_payment : '',
        transaction_id: typeof item.transaction_id === 'string' ? item.transaction_id : ''
      }));
    } catch (error: unknown) {
      console.error('Error parsing transactions:', error);
      return [];
    }
  }

  useEffect(() => {
    const setupSubscription = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Authentication error:', authError);
          window.location.href = '/auth'
          return
        }
        
        if (!user) {
          window.location.href = '/auth'
          return
        }

        setUser(user);

        // Initial fetch of transaction data from user_data table
        const { data: userData, error: userDataError } = await supabase
          .from('user_data')
          .select('stripe_id')
          .eq('UID', user.id)
          .single()

        if (userDataError) {
          console.error('Error fetching user data:', userDataError)
        } else {
          // Fetch website settings
          const { data: settingsData, error: settingsError } = await supabase
            .from('website_settings')
            .select('*')
            .single()

          if (settingsError) {
            console.error('Error fetching website settings:', settingsError)
          } else if (settingsData) {
            setSettings(settingsData as WebsiteSettings)
          }

          // Process transactions from stripe_id column
          if (userData && userData.stripe_id && Array.isArray(userData.stripe_id)) {
            setTransactions(parseTransactions(userData.stripe_id))
          }

          // Set up realtime subscription for user_data changes
          const channel = supabase
            .channel('user-data-changes')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'user_data',
                filter: `UID=eq.${user.id}`
              },
              (payload) => {
                // Refresh user data when changes occur
                supabase
                  .from('user_data')
                  .select('stripe_id')
                  .eq('UID', user.id)
                  .single()
                  .then(({ data, error }) => {
                    if (error) {
                      console.error('Error fetching updated user data:', error)
                      return
                    }
                    if (data && data.stripe_id && Array.isArray(data.stripe_id)) {
                      setTransactions(parseTransactions(data.stripe_id))
                    }
                  })
              }
            )
            .subscribe()

          setRealtimeChannel(channel)
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load billing information';
        console.error('Error setting up subscription:', error)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    setupSubscription()

    // Cleanup function
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally empty: realtimeChannel is created in this effect and cleaned up when unmounting

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user) return;

        // Fetch website settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('website_settings')
          .select('*')
          .single()

        if (settingsError) {
          console.error('Error fetching website settings:', settingsError)
        } else if (settingsData) {
          setSettings(settingsData as WebsiteSettings)
        }

        // Fetch user data for transactions
        const { data: userData, error: userDataError } = await supabase
          .from('user_data')
          .select('stripe_id')
          .eq('UID', user.id)
          .single()

        if (userDataError) {
          console.error('Error fetching user data:', userDataError)
        } else if (userData && userData.stripe_id && Array.isArray(userData.stripe_id)) {
          setTransactions(parseTransactions(userData.stripe_id))
        }
      } catch (error: unknown) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [user])

  if (loading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-2xl text-center">
          <CardHeader>
            <CardTitle>{error}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {settings?.enable_credits && (
        <div className="flex justify-end mb-8">
          <UserCredits />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-8">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{transaction.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      transaction.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : transaction.status === 'inactive'
                        ? 'bg-red-100 text-red-800'
                        : transaction.status === 'one-off'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.status === 'one-off' ? 'One-time Purchase' : 
                       transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      Price: ${transaction.price}
                      {transaction.interval !== 'one-off' && `/${transaction.interval}`}
                    </div>
                    <div>
                      Last Payment: {new Date(transaction.last_payment).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Transaction ID: {transaction.transaction_id}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-end mt-6">
                <Button onClick={handleManageSubscription}>
                  Manage Subscription
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">No active subscriptions or purchases found.</p>
              <Button asChild>
                <a href="/pricing">View Plans</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 