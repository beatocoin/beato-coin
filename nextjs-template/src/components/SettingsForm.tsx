"use client"

import React, { useEffect, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient, updateClient } from "@/utils/supabase/client"
import { useTheme } from "@/contexts/ThemeContext"
import { clearSiteNameCache } from "@/utils/site-name"
import Loading from '@/components/ui/loading'
import { clearTrialCreditsCache } from "@/utils/trial-credits"
import { Trash2, Loader2, Eye, EyeOff } from "lucide-react"
import toast, { Toaster } from 'react-hot-toast'

interface ThemeColors {
  primary: string
  secondary: string
  dark: string
  accent1: string
  accent2: string
  header: string
  pageBackground: string
}

interface SocialLinks {
  twitter: string
  facebook: string
  linkedin: string
}

interface SeoSettings {
  meta_title: string
  meta_description: string
  keywords: string[]
}

interface SettingsFormData {
  stripe_publishable_key: string
  stripe_secret_key: string
  stripe_webhook_secret: string
  site_name: string
  site_description: string
  site_domain: string
  theme_colors: ThemeColors
  maintenance_mode: boolean
  contact_email: string
  social_links: SocialLinks
  analytics_id: string
  seo_settings: SeoSettings
  enable_credits: boolean
  offer_trial_credits: boolean
  trial_credit_amount: number
  trial_credits_pricing_page: boolean
  enable_affiliate: boolean
  commission_type: 'flat_rate' | 'percentage'
  affiliate_commission: number
}

type HandleChangeEvent = 
  | ChangeEvent<HTMLInputElement | HTMLTextAreaElement> 
  | { target: { name: string; value: any } }

export default function SettingsForm() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentSettingsId, setCurrentSettingsId] = useState<string>("")
  const [formData, setFormData] = useState<SettingsFormData>({
    stripe_publishable_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    site_name: '',
    site_description: '',
    site_domain: '',
    theme_colors: {
      primary: '#000000',
      secondary: '#ffffff',
      dark: '#000000',
      accent1: '#000000',
      accent2: '#ffffff',
      header: '#000000',
      pageBackground: '#ffffff'
    },
    maintenance_mode: false,
    contact_email: '',
    social_links: {
      twitter: '',
      facebook: '',
      linkedin: ''
    },
    analytics_id: '',
    seo_settings: {
      meta_title: '',
      meta_description: '',
      keywords: []
    },
    enable_credits: false,
    offer_trial_credits: false,
    trial_credit_amount: 0,
    trial_credits_pricing_page: false,
    enable_affiliate: false,
    commission_type: 'flat_rate',
    affiliate_commission: 0
  })
  const [settings, setSettings] = useState<SettingsFormData | null>(null)
  const [colors, setColors] = useState<ThemeColors>({
    primary: '#000000',
    secondary: '#ffffff',
    dark: '#000000',
    accent1: '#000000',
    accent2: '#ffffff',
    header: '#000000',
    pageBackground: '#ffffff'
  })

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('website_settings')
          .select('*')
          .single()

        if (error) throw error
        setSettings(data)
        if (data) {
          setCurrentSettingsId(data.id)
          setFormData(data)
          if (data.theme_colors) {
            setColors(data.theme_colors)
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        toast.error('Failed to load settings. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [supabase])

  // Update theme colors when they change in the form
  useEffect(() => {
    if (formData?.theme_colors) {
      setColors(formData.theme_colors)
    }
  }, [formData?.theme_colors, setColors])

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData(prevData => {
        // Create a normalized copy of settings to prevent null values
        const normalizedSettings = { ...settings };
        
        // Ensure strings are not null
        normalizedSettings.stripe_publishable_key = settings.stripe_publishable_key || '';
        normalizedSettings.stripe_secret_key = settings.stripe_secret_key || '';
        normalizedSettings.stripe_webhook_secret = settings.stripe_webhook_secret || '';
        normalizedSettings.site_name = settings.site_name || '';
        normalizedSettings.site_description = settings.site_description || '';
        normalizedSettings.site_domain = settings.site_domain || '';
        normalizedSettings.contact_email = settings.contact_email || '';
        normalizedSettings.analytics_id = settings.analytics_id || '';
        
        // Ensure theme colors have default values
        if (!normalizedSettings.theme_colors || typeof normalizedSettings.theme_colors !== 'object') {
          normalizedSettings.theme_colors = {
            primary: '#5EB1BF',
            secondary: '#F8FDFF',
            dark: '#233D4D',
            accent1: '#E07A5F',
            accent2: '#FCB97D',
            header: '#FFFFFF',
            pageBackground: '#F8FDFF'
          };
        } else {
          // Ensure each color has a value
          const defaultColors: ThemeColors = {
            primary: '#5EB1BF',
            secondary: '#F8FDFF',
            dark: '#233D4D',
            accent1: '#E07A5F',
            accent2: '#FCB97D',
            header: '#FFFFFF',
            pageBackground: '#F8FDFF'
          };
          
          // Type-safe way to check and set default values for each theme color
          (Object.keys(defaultColors) as Array<keyof ThemeColors>).forEach(key => {
            if (!normalizedSettings.theme_colors[key]) {
              normalizedSettings.theme_colors[key] = defaultColors[key];
            }
          });
        }
        
        // Ensure nested objects have default values
        if (!normalizedSettings.social_links || typeof normalizedSettings.social_links !== 'object') {
          normalizedSettings.social_links = {
            twitter: '',
            facebook: '',
            linkedin: ''
          };
        } else {
          // Ensure social links are not null
          normalizedSettings.social_links.twitter = normalizedSettings.social_links.twitter || '';
          normalizedSettings.social_links.facebook = normalizedSettings.social_links.facebook || '';
          normalizedSettings.social_links.linkedin = normalizedSettings.social_links.linkedin || '';
        }
        
        // Ensure SEO settings have default values
        if (!normalizedSettings.seo_settings || typeof normalizedSettings.seo_settings !== 'object') {
          normalizedSettings.seo_settings = {
            meta_title: '',
            meta_description: '',
            keywords: []
          };
        } else {
          // Ensure SEO settings values are not null
          normalizedSettings.seo_settings.meta_title = normalizedSettings.seo_settings.meta_title || '';
          normalizedSettings.seo_settings.meta_description = normalizedSettings.seo_settings.meta_description || '';
          normalizedSettings.seo_settings.keywords = Array.isArray(normalizedSettings.seo_settings.keywords) 
            ? normalizedSettings.seo_settings.keywords 
            : [];
        }
        
        return {
          ...prevData,
          ...normalizedSettings
        };
      });
    }
  }, [settings]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Update website settings
      const { error: settingsError } = await supabase
        .from('website_settings')
        .update({
          stripe_publishable_key: formData.stripe_publishable_key,
          stripe_secret_key: formData.stripe_secret_key,
          stripe_webhook_secret: formData.stripe_webhook_secret,
          site_name: formData.site_name,
          site_description: formData.site_description,
          site_domain: formData.site_domain,
          theme_colors: formData.theme_colors,
          maintenance_mode: formData.maintenance_mode,
          contact_email: formData.contact_email,
          social_links: formData.social_links,
          analytics_id: formData.analytics_id,
          seo_settings: formData.seo_settings,
          enable_credits: formData.enable_credits,
          trial_credits: formData.offer_trial_credits ? formData.trial_credit_amount : 0,
          trial_credits_pricing_page: formData.trial_credits_pricing_page,
          enable_affiliate: formData.enable_affiliate,
          commission_type: formData.commission_type,
          affiliate_commission: formData.affiliate_commission,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSettingsId)

      if (settingsError) {
        throw settingsError
      }

      // Clear site name cache and update theme colors
      clearSiteNameCache()
      clearTrialCreditsCache()
      setColors(formData.theme_colors)

      toast.success('Settings updated successfully', {
        position: 'top-center',
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#FFFFFF',
          padding: '16px',
          borderRadius: '8px',
        },
        iconTheme: {
          primary: '#FFFFFF',
          secondary: '#10B981',
        },
      })
    } catch (error: any) {
      console.error('Error updating settings:', error)
      toast.error(error.message || 'Failed to update settings', {
        position: 'top-center',
        duration: 3000,
        style: {
          background: '#EF4444',
          color: '#FFFFFF',
          padding: '16px',
          borderRadius: '8px',
        },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement> | { target: { name: string; value: any } }) => {
    const { name, value } = e.target

    // Special handling for affiliate commission
    if (name === 'affiliate_commission') {
      // For percentage, only allow whole numbers between 0 and 100
      if (formData.commission_type === 'percentage') {
        const numValue = Math.floor(Number(value))
        if (numValue >= 0 && numValue <= 100) {
          setFormData((prev: SettingsFormData) => ({
            ...prev,
            [name]: numValue
          }))
        }
        return
      }
      
      // For flat rate, allow decimals with 2 decimal places
      const numValue = Number(value)
      if (!isNaN(numValue) && numValue >= 0) {
        setFormData((prev: SettingsFormData) => ({
          ...prev,
          [name]: Number(numValue.toFixed(2))
        }))
      }
      return
    }

    // Default handling for other fields
    setFormData((prev: SettingsFormData) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleColorChange = (e: ChangeEvent<HTMLInputElement>, k: keyof ThemeColors) => {
    setFormData((prev: SettingsFormData) => ({
      ...prev,
      theme_colors: {
        ...prev.theme_colors,
        [k]: e.target.value
      }
    }))
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <form onSubmit={handleSubmit} className="pb-20">
      {/* Toast Container */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
        }}
      />
      
      {/* Fixed Save Button */}
      <div className="fixed top-24 right-8 z-50">
        <Button 
          type="submit" 
          size="lg" 
          className="shadow-lg px-[50px]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>

      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Stripe Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stripe_publishable_key">Stripe Publishable Key</Label>
              <Input
                id="stripe_publishable_key"
                name="stripe_publishable_key"
                type="password"
                value={formData.stripe_publishable_key}
                onChange={handleChange}
                placeholder="pk_..."
              />
              <p className="text-sm text-muted-foreground">
                Your Stripe publishable key starts with &apos;pk_&apos;. You can find it in your Stripe Dashboard under Developers → API keys.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe_secret_key">Stripe Secret Key</Label>
              <Input
                id="stripe_secret_key"
                name="stripe_secret_key"
                type="password"
                value={formData.stripe_secret_key}
                onChange={handleChange}
                placeholder="sk_..."
              />
              <p className="text-sm text-muted-foreground">
                Your Stripe secret key starts with &apos;sk_&apos;. You can find it in your Stripe Dashboard under Developers → API keys.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe_webhook_secret">Stripe Webhook Secret</Label>
              <Input
                id="stripe_webhook_secret"
                name="stripe_webhook_secret"
                value={formData.stripe_webhook_secret}
                onChange={handleChange}
                type="password"
                placeholder="whsec_..."
              />
              <div className="text-sm text-muted-foreground space-y-2">
                <p>To set up your Stripe webhook:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Go to your <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stripe Dashboard Webhooks section</a></li>
                  <li>Click &quot;Add endpoint&quot;</li>
                  <li>Enter your webhook URL: <code className="bg-muted px-1 py-0.5 rounded">https://your-domain.com/api/webhooks/stripe</code></li>
                  <li>For API version, select &quot;Your current version&quot; (do not select &quot;Latest API version&quot;)</li>
                  <li>Select events to listen to:
                    <ul className="list-disc ml-4 mt-1">
                      <li>customer.subscription.created</li>
                      <li>customer.subscription.updated</li>
                      <li>customer.subscription.deleted</li>
                      <li>checkout.session.completed</li>
                      <li>payment_intent.succeeded</li>
                      <li>payment_intent.payment_failed</li>
                    </ul>
                  </li>
                  <li>Click &quot;Add endpoint&quot; to save</li>
                  <li>Copy the signing secret (starts with &quot;whsec_&quot;) and paste it here</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site_name">Site Name</Label>
                <Input
                  id="site_name"
                  name="site_name"
                  value={formData.site_name}
                  onChange={handleChange}
                  placeholder="My Website"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_description">Site Description</Label>
                <Input
                  id="site_description"
                  name="site_description"
                  value={formData.site_description}
                  onChange={handleChange}
                  placeholder="A brief description of your website"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_domain">Site Domain</Label>
                <Input
                  id="site_domain"
                  name="site_domain"
                  value={formData.site_domain}
                  onChange={handleChange}
                  placeholder="example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance_mode">Dev Mode</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="maintenance_mode"
                    name="maintenance_mode"
                    checked={formData.maintenance_mode}
                    onCheckedChange={(checked: boolean) => handleChange({ 
                      target: { name: 'maintenance_mode', value: checked } 
                    })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Dev Mode will allow you to see the json data returned by the api calls for the application on pages like the Dashboard and Products page.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits & API */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Credits & API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_credits">Enable Credits</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable the credits system
                  </p>
                </div>
                <Switch
                  id="enable_credits"
                  name="enable_credits"
                  checked={formData.enable_credits}
                  onCheckedChange={(checked: boolean) => handleChange({
                    target: { name: 'enable_credits', value: checked }
                  })}
                />
              </div>
              {formData.enable_credits && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="offer_trial_credits">Offer Trial Credits</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable trial credits for new users
                      </p>
                    </div>
                    <Switch
                      id="offer_trial_credits"
                      name="offer_trial_credits"
                      checked={formData.offer_trial_credits}
                      onCheckedChange={(checked: boolean) => handleChange({
                        target: { name: 'offer_trial_credits', value: checked }
                      })}
                    />
                  </div>
                  {formData.offer_trial_credits && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="trial_credit_amount">Trial Credits Amount</Label>
                        <Input
                          id="trial_credit_amount"
                          name="trial_credit_amount"
                          type="number"
                          value={formData.trial_credit_amount}
                          onChange={handleChange}
                          placeholder="Enter amount of trial credits"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="trial_credits_pricing_page">Show on Pricing Page</Label>
                          <p className="text-sm text-muted-foreground">
                            Display trial credits offer on the pricing page
                          </p>
                        </div>
                        <Switch
                          id="trial_credits_pricing_page"
                          name="trial_credits_pricing_page"
                          checked={formData.trial_credits_pricing_page}
                          onCheckedChange={(checked: boolean) => handleChange({
                            target: { name: 'trial_credits_pricing_page', value: checked }
                          })}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Affiliate Program */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Affiliate Program</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_affiliate">Enable Affiliate Program</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable the affiliate program
                  </p>
                </div>
                <Switch
                  id="enable_affiliate"
                  name="enable_affiliate"
                  checked={formData.enable_affiliate}
                  onCheckedChange={(checked: boolean) => handleChange({
                    target: { name: 'enable_affiliate', value: checked }
                  })}
                />
              </div>
              {formData.enable_affiliate && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="commission_type">Commission Type</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose between flat rate or percentage commission
                    </p>
                    <Select
                      value={formData.commission_type}
                      onValueChange={(value) => handleChange({
                        target: { name: 'commission_type', value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select commission type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat_rate">Flat Rate ($)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="affiliate_commission">
                      Affiliate Commission {formData.commission_type === 'percentage' ? '(%)' : '($)'}
                    </Label>
                    <Input
                      id="affiliate_commission"
                      name="affiliate_commission"
                      type="number"
                      step={formData.commission_type === 'percentage' ? '1' : '0.01'}
                      min="0"
                      max={formData.commission_type === 'percentage' ? '100' : undefined}
                      value={formData.affiliate_commission}
                      onChange={handleChange}
                      placeholder={formData.commission_type === 'percentage' ? 'Enter whole number (0-100)' : 'Enter amount'}
                    />
                    {formData.commission_type === 'percentage' && (
                      <p className="text-sm text-muted-foreground">
                        Please enter a whole number between 0 and 100
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Theme Section */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(formData.theme_colors).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`theme_colors.${key}`} className="capitalize">
                  {key.replace('_', ' ')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id={`theme_colors.${key}`}
                    name={`theme_colors.${key}`}
                    value={value}
                    onChange={(e) => handleColorChange(e, key as keyof ThemeColors)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={value}
                    onChange={(e) => handleColorChange(e, key as keyof ThemeColors)}
                    name={`theme_colors.${key}`}
                    placeholder={value}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleChange}
                placeholder="contact@example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Links Section */}
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(formData.social_links).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`social_links.${key}`} className="capitalize">
                  {key}
                </Label>
                <Input
                  id={`social_links.${key}`}
                  name={`social_links.${key}`}
                  value={value}
                  onChange={handleChange}
                  placeholder={`https://${key}.com/username`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="analytics_id">Analytics ID</Label>
              <Input
                id="analytics_id"
                name="analytics_id"
                value={formData.analytics_id}
                onChange={handleChange}
                placeholder="G-XXXXXXXXXX"
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO Section */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seo_settings.meta_title">Meta Title</Label>
              <Input
                id="seo_settings.meta_title"
                name="seo_settings.meta_title"
                value={formData.seo_settings.meta_title}
                onChange={handleChange}
                placeholder="Page Title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo_settings.meta_description">Meta Description</Label>
              <Input
                id="seo_settings.meta_description"
                name="seo_settings.meta_description"
                value={formData.seo_settings.meta_description}
                onChange={handleChange}
                placeholder="Page description for search engines"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo_settings.keywords">Keywords (comma-separated)</Label>
              <Input
                id="seo_settings.keywords"
                name="seo_settings.keywords"
                value={formData.seo_settings.keywords.join(', ')}
                onChange={(e) => {
                  const keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                  handleChange({
                    name: 'seo_settings.keywords',
                    value: keywords
                  } as any)
                }}
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
} 