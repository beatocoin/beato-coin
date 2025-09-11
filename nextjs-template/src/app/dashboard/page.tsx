"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Loading from "@/components/ui/loading"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import UserCredits from '@/components/UserCredits'
import { Check } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "@/utils/toast"
import ClaimCreditsButton from "@/components/ClaimCreditsButton"
import { Input } from "@/components/ui/input"
import * as React from "react"

// Simple type assertions to fix build issues with Next.js 15.2.1
const AvatarComponent = Avatar as any
const AvatarImageComponent = AvatarImage as any
const AvatarFallbackComponent = AvatarFallback as any
const LoadingComponent = Loading as any
const CardComponent = Card as any
const CardHeaderComponent = CardHeader as any
const CardTitleComponent = CardTitle as any
const CardContentComponent = CardContent as any
const ButtonComponent = Button as any
const LabelComponent = Label as any
const InputComponent = Input as any
const CheckComponent = Check as any
const ClaimCreditsButtonComponent = ClaimCreditsButton as any
const UserCreditsComponent = UserCredits as any

interface UserData {
  id: string;
  UID: string;
  user_role: string;
  credits: number;
  email: string;
  trial_credits_claimed: boolean;
  created_at: string;
  user_metadata: {
    avatar_url?: string;
    email?: string;
    name?: string;
    full_name?: string;
    phone?: string;
  };
}

interface WebsiteSettings {
  enable_credits: boolean;
  trial_credits: number;
  trial_credits_pricing_page: boolean;
  enable_affiliate: boolean;
  commission_type: 'flat_rate' | 'percentage';
  affiliate_commission: number;
  site_domain: string;
}

export default function DashboardPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [settings, setSettings] = useState<WebsiteSettings | null>(null)
  const [customUrl, setCustomUrl] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (!user) {
          window.location.href = '/auth'
          return
        }

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
          .select('enable_credits, trial_credits, trial_credits_pricing_page, enable_affiliate, commission_type, affiliate_commission, site_domain')
          .single()

        if (settingsError) {
          console.error('Error fetching settings:', settingsError)
          return
        }

        setSettings(settingsData)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [supabase])

  if (isLoading) {
    return <LoadingComponent />
  }

  const getInitials = (name: string | undefined) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Format date with fallback for undefined
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Helper function to capitalize user role
  const capitalizeUserRole = (role: string | undefined) => {
    if (!role) return 'Not assigned'
    return role.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <div className="container mx-auto px-4 py-8 dashboard-page">
      <div className="flex flex-col items-center space-y-6">
        <div className="w-full max-w-[1000px] flex flex-col items-center space-y-6">
          {/* Grid layout for Avatar and Credits */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Avatar and User Info */}
            <div className="flex flex-col items-center space-y-4">
              <AvatarComponent className="w-24 h-24">
                <AvatarImageComponent 
                  src={userData?.user_metadata?.avatar_url} 
                  alt={userData?.user_metadata?.full_name || userData?.email || ''} 
                />
                <AvatarFallbackComponent>
                  {getInitials(userData?.user_metadata?.full_name || userData?.email)}
                </AvatarFallbackComponent>
              </AvatarComponent>
              <h1 className="text-2xl font-bold">{userData?.user_metadata?.full_name || userData?.email || 'User'}</h1>
            </div>
            
            {/* Available Credits Component */}
            {settings?.enable_credits && (
              <div className="flex justify-center md:justify-end">
                <UserCreditsComponent />
              </div>
            )}
          </div>

          {/* Grid container for Account Info and Credits/Trial - Only show grid layout if eligible AND trial credits exist */}
          {settings?.trial_credits && settings.trial_credits > 0 && settings.trial_credits_pricing_page ? (
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Account Information - Takes up 2/3 of the space */}
              <CardComponent className="lg:col-span-2 w-full">
                <CardHeaderComponent>
                  <CardTitleComponent>Account Information</CardTitleComponent>
                </CardHeaderComponent>
                <CardContentComponent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 border-b pb-2">
                      <div className="font-semibold">Email</div>
                      <div className="col-span-2">{userData?.email}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b pb-2">
                      <div className="font-semibold">Phone Number</div>
                      <div className="col-span-2">{userData?.user_metadata?.phone || 'Not provided'}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b pb-2">
                      <div className="font-semibold">Account Created</div>
                      <div className="col-span-2">
                        {formatDate(userData?.created_at)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-b pb-2">
                      <div className="font-semibold">User Role</div>
                      <div className="col-span-2">{capitalizeUserRole(userData?.user_role)}</div>
                    </div>
                    {/* Only show API Credits if enable_credits is true */}
                    {settings?.enable_credits && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold">API Credits</div>
                        <div className="col-span-2">{Number(userData?.credits || 0).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </CardContentComponent>
              </CardComponent>

              {/* Credits and Trial Block - Takes up 1/3 of the space */}
              <div className="space-y-6">
                {/* Trial Credits Block - Only show if credits haven't been claimed */}
                {settings?.trial_credits > 0 && 
                 settings?.trial_credits_pricing_page && 
                 !userData?.trial_credits_claimed && (
                  <CardComponent className="w-full h-fit">
                    <CardHeaderComponent>
                      <CardTitleComponent className="text-2xl font-bold">
                        Claim Your Free Credits
                      </CardTitleComponent>
                      <p className="text-muted-foreground text-center">
                        Get {settings.trial_credits} Free Credits
                      </p>
                    </CardHeaderComponent>
                    <CardContentComponent className="flex flex-col">
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <CheckComponent className="mr-2 h-4 w-4 text-primary" />
                          <span>No credit card required</span>
                        </div>
                        <div className="flex items-center">
                          <CheckComponent className="mr-2 h-4 w-4 text-primary" />
                          <span>Try our service risk-free</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center mt-6">
                        <ClaimCreditsButtonComponent 
                          trialCredits={settings.trial_credits}
                          className="w-full max-w-[175px]"
                        />
                      </div>
                    </CardContentComponent>
                  </CardComponent>
                )}
              </div>
            </div>
          ) : (
            /* Show only Account Information card if not eligible */
            <CardComponent className="w-full">
              <CardHeaderComponent>
                <CardTitleComponent>Account Information</CardTitleComponent>
              </CardHeaderComponent>
              <CardContentComponent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 border-b pb-2">
                    <div className="font-semibold">Email</div>
                    <div className="col-span-2">{userData?.email}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b pb-2">
                    <div className="font-semibold">Phone Number</div>
                    <div className="col-span-2">{userData?.user_metadata?.phone || 'Not provided'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b pb-2">
                    <div className="font-semibold">Account Created</div>
                    <div className="col-span-2">
                      {formatDate(userData?.created_at)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b pb-2">
                    <div className="font-semibold">User Role</div>
                    <div className="col-span-2">{capitalizeUserRole(userData?.user_role)}</div>
                  </div>
                  {/* Only show API Credits if enable_credits is true */}
                  {settings?.enable_credits && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="font-semibold">API Credits</div>
                      <div className="col-span-2">{Number(userData?.credits || 0).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </CardContentComponent>
            </CardComponent>
          )}

          {/* Add this after the Account Information card */}
          {settings?.enable_affiliate && (
            <CardComponent className="lg:col-span-3 w-full">
              <CardHeaderComponent>
                <CardTitleComponent>Your Referral Link</CardTitleComponent>
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
        </div>
      </div>
    </div>
  )
} 