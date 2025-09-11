/// <reference types="react" />
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Loading from "@/components/ui/loading"
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "@/utils/toast"

// Simple type assertions to fix build issues with Next.js 15.2.1
const CardComponent = Card as any
const CardHeaderComponent = CardHeader as any
const CardTitleComponent = CardTitle as any
const CardContentComponent = CardContent as any
const ButtonComponent = Button as any
const LabelComponent = Label as any
const InputComponent = Input as any
const LoadingComponent = Loading as any

interface AffiliateTransaction {
  id: string
  created_at: string
  amount: number
  status: 'pending' | 'paid'
  customer_email: string
  commission_amount: number
  affiliate_id: string
  affiliate_email?: string
  stripe_connected_account_id?: string | null
}

interface WebsiteSettings {
  enable_affiliate: boolean
  commission_type: 'flat_rate' | 'percentage'
  affiliate_commission: number
  site_domain: string
}

// Create Supabase client outside component to avoid dependency issues
const supabase = createClient()

export default function AffiliateDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<AffiliateTransaction[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<WebsiteSettings | null>(null)
  const [customUrl, setCustomUrl] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [userData, setUserData] = useState<any>(null)

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

        // Get user data
        const { data: userData, error: userDataError } = await supabase
          .from('user_data')
          .select('*')
          .eq('UID', user.id)
          .single()

        if (userDataError) {
          console.error('Error fetching user data:', userDataError)
          return
        }

        setUserData(userData)

        // Get website settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('website_settings')
          .select('enable_affiliate, commission_type, affiliate_commission, site_domain')
          .single()

        if (settingsError) {
          console.error('Error fetching settings:', settingsError)
          return
        }

        setSettings(settingsData)

        // Get affiliate transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('affiliate_transactions')
          .select('*')
          .eq('affiliate_id', user.id)
          .order('created_at', { ascending: false })

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError)
          return
        }

        setTransactions(transactionsData || [])
      } catch (error) {
        console.error('Error loading affiliate data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, []) // Run only once on component mount

  if (isLoading) {
    return <LoadingComponent />
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Affiliate Program Block */}
      {settings?.enable_affiliate && (
        <CardComponent className="w-full mb-8 mx-auto" style={{ maxWidth: "1000px" }}>
          <CardHeaderComponent>
          </CardHeaderComponent>
          <CardContentComponent>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-lg">
                  Earn {settings.commission_type === `percentage`
                    ? `${settings.affiliate_commission || 1}% commission` 
                    : `$${settings.affiliate_commission || 1} commission`} 
                  for every paying user who signs up through your affiliate link, with recurring commissions for every rebill as long as they remain subscribed!
                </p>
              </div>
              <div className="bg-muted p-6 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <LabelComponent>Your Default Affiliate Link</LabelComponent>
                    <ButtonComponent
                      variant="outline"
                      onClick={() => {
                        const baseUrl = settings.site_domain 
                          ? `https://${settings.site_domain}`
                          : window.location.origin;
                        navigator.clipboard.writeText(`${baseUrl}/?aff=${userData?.UID}`);
                        toast.success('Affiliate link copied to clipboard!');
                      }}
                    >
                      Copy Link
                    </ButtonComponent>
                  </div>
                  <div className="p-3 bg-background rounded border text-center break-all font-mono">
                    {settings.site_domain 
                      ? `https://${settings.site_domain}/?aff=${userData?.UID}`
                      : `${window.location.origin}/?aff=${userData?.UID}`}
                  </div>
                </div>
              </div>

              {/* Link Generator Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Affiliate Link Generator</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate affiliate links for any page on our website. Simply paste the URL you want to promote, 
                    and we&apos;ll create a trackable affiliate link for you. Use these links in your marketing materials, 
                    social media posts, or anywhere else you want to promote our services.
                  </p>
                </div>
                <div className="flex gap-2">
                  <InputComponent
                    placeholder="Paste any URL from our website..."
                    value={customUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setCustomUrl(e.target.value);
                      try {
                        // Validate URL is from our domain
                        const url = new URL(e.target.value);
                        const domain = settings.site_domain || window.location.host;
                        if (url.host === domain) {
                          setUrlError('');
                          // Add aff parameter if not present
                          url.searchParams.set('aff', userData?.UID || '');
                          setGeneratedUrl(url.toString());
                        } else {
                          setUrlError('Please enter a URL from our website');
                          setGeneratedUrl('');
                        }
                      } catch (err) {
                        setUrlError('Please enter a valid URL');
                        setGeneratedUrl('');
                      }
                    }}
                    className="flex-1"
                  />
                  {generatedUrl && (
                    <ButtonComponent
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedUrl);
                        toast.success("Affiliate link copied to clipboard!");
                      }}
                    >
                      Copy
                    </ButtonComponent>
                  )}
                </div>
                {urlError && <p className="text-sm text-destructive">{urlError}</p>}
                {generatedUrl && (
                  <div className="p-3 bg-background rounded border break-all font-mono">
                    {generatedUrl}
                  </div>
                )}
              </div>
            </div>
          </CardContentComponent>
        </CardComponent>
      )}

      <h1 className="text-2xl font-bold mb-8">Your Referrals</h1>
      
      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Transaction History</h2>
        </div>
        <div className="p-4">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-gray-100">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Commission</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b">
                      <td className="px-6 py-4">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">{transaction.customer_email}</td>
                      <td className="px-6 py-4">{formatCurrency(transaction.amount)}</td>
                      <td className="px-6 py-4">{formatCurrency(transaction.commission_amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 