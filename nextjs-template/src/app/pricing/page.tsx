"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Stripe from "stripe"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { loadStripe } from '@stripe/stripe-js'
import Loading from "@/components/ui/loading"
import ClaimCreditsButton from "@/components/ClaimCreditsButton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Simple type assertions to fix build issues with Next.js 15.2.1
const LoadingComponent = Loading as any
const CheckComponent = Check as any
const XComponent = X as any
const InfoComponent = Info as any
const CardComponent = Card as any
const CardHeaderComponent = CardHeader as any
const CardTitleComponent = CardTitle as any
const CardContentComponent = CardContent as any
const ButtonComponent = Button as any
const TooltipComponent = Tooltip as any
const TooltipContentComponent = TooltipContent as any
const TooltipProviderComponent = TooltipProvider as any
const TooltipTriggerComponent = TooltipTrigger as any
const ClaimCreditsButtonComponent = ClaimCreditsButton as any
const LinkComponent = Link as any

// Cache keys
const CACHE_KEY_PRODUCTS = 'stripe_products_cache'
const CACHE_KEY_TIMESTAMP = 'stripe_products_cache_timestamp'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Interface for Theme Colors
interface ThemeColors {
  dark: string
  header: string
  accent1: string
  accent2: string
  primary: string
  secondary: string
  pageBackground: string
}

// Interface for Website Settings
interface WebsiteSettings {
  stripe_publishable_key: string
  stripe_secret_key: string
  stripe_webhook_secret: string
  site_name: string
  site_description: string
  site_domain: string
  theme_colors: ThemeColors
  maintenance_mode: boolean
  contact_email?: string
  social_links?: Record<string, string>
  analytics_id?: string
  seo_settings?: Record<string, any>
  enable_credits: boolean
  trial_credits: number
  trial_credits_pricing_page: boolean
  enable_affiliate: boolean
  commission_type: 'flat_rate' | 'percentage'
  affiliate_commission: number
}

// Add this interface near the top with other interfaces
interface StripeProductWithAllPrices extends Stripe.Product {
  all_prices?: Stripe.Price[];
}

// Helper function to parse feature text and render tooltips
const FeatureWithTooltip = ({ feature }: { feature: string }) => {
  // Check if the feature contains tooltip content
  if (feature.includes('[tt]') && feature.includes('[/tt]')) {
    // Extract the tooltip content and the text to display
    const tooltipRegex = /\[tt\](.*?)\[\/tt\]/g;
    
    // Replace [tt][/tt] tags with empty string to get clean display text
    const displayText = feature.replace(/\[tt\](.*?)\[\/tt\]/g, '');
    
    // Extract all tooltip content
    const tooltipMatches = [...feature.matchAll(tooltipRegex)];
    const tooltipContent = tooltipMatches.map(match => match[1]).join('\n');
    
    return (
      <span className="flex items-center">
        {displayText}
        <TooltipProviderComponent>
          <TooltipComponent>
            <TooltipTriggerComponent asChild>
              <span className="inline-flex items-center cursor-help ml-1.5">
                <InfoComponent className="h-4 w-4 text-blue-500" />
              </span>
            </TooltipTriggerComponent>
            <TooltipContentComponent className="max-w-xs p-3 bg-blue-50 border border-blue-200 text-blue-800">
              <p className="text-sm whitespace-pre-line">{tooltipContent}</p>
            </TooltipContentComponent>
          </TooltipComponent>
        </TooltipProviderComponent>
      </span>
    );
  }
  
  // If no tooltip, just return the feature text
  return <span>{feature}</span>;
};

// Helper function to get product prices
const getProductPrices = (product: StripeProductWithAllPrices): Stripe.Price[] => {
  return product.all_prices || [];
};

// Helper function to check if product has annual pricing
const hasAnnualPricing = (product: StripeProductWithAllPrices): boolean => {
  const prices = getProductPrices(product);
  return prices.some((p: Stripe.Price) => p.recurring?.interval === 'year') ?? false;
};

// Helper function to check if product has lifetime pricing
const hasLifetimePricing = (product: StripeProductWithAllPrices): boolean => {
  const prices = getProductPrices(product);
  return prices.some((p: Stripe.Price) => p.type === 'one_time' || p.recurring === null) ?? false;
};

// Helper function to get features
const getFeatures = (product: StripeProductWithAllPrices): string[] => {
  if (!product || !product.metadata || !product.metadata.features) return [];
  try {
    const features = product.metadata.features;
    return typeof features === 'string' ? JSON.parse(features) : [];
  } catch (e) {
    console.error('Error parsing features:', e);
    return [];
  }
};

// Add a new helper function to get marketing features from metadata
const getMarketingFeatures = (product: StripeProductWithAllPrices): string[] => {
  if (!product || !product.metadata) return [];
  
  return Object.entries(product.metadata)
    .filter(([key]) => key.startsWith('marketing_feature_'))
    .map(([_, value]) => value as string)
    .filter(feature => feature && feature.trim() !== '');
};

// Combined function to get all features (both types)
const getAllFeatures = (product: StripeProductWithAllPrices): string[] => {
  const regularFeatures = getFeatures(product);
  const marketingFeatures = getMarketingFeatures(product);
  
  // Combine both types of features, with marketing features first
  return [...marketingFeatures, ...regularFeatures];
};

export default function PricingPage() {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isSettingsLoading, setIsSettingsLoading] = useState(true)
  const [products, setProducts] = useState<Stripe.Product[]>([])
  const [cachedProducts, setCachedProducts] = useState<Stripe.Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<WebsiteSettings | null>(null)
  const [themeColors, setThemeColors] = useState<ThemeColors | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [session, setSession] = useState(false)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly')
  const [trialCreditsEligible, setTrialCreditsEligible] = useState(false)

  // Helper function to handle get started
  const handleGetStarted = async (product: Stripe.Product): Promise<void> => {
    try {
      // Get the user's session
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Redirect to login if not authenticated
        window.location.href = `/auth?redirect=${encodeURIComponent('/pricing')}`
        return
      }

      // Get the correct price based on billing interval
      const price = product.prices?.find((p: any) => 
        billingInterval === 'yearly' ? 
        p.recurring?.interval === 'year' : 
        p.recurring?.interval === 'month'
      )

      if (!price) {
        console.error("No price found for this billing interval")
        return
      }

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: price.id,
          metadata: {
            credits: product.metadata.credits,
            planName: product.name
          }
        })
      })

      const { sessionId, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      // Redirect to Stripe Checkout
      if (settings) {
        const stripe = await loadStripe(settings.stripe_publishable_key, {
          apiVersion: '2025-04-30.basil'
        })
        if (!stripe) {
          throw new Error('Failed to load Stripe')
        }

        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId })
        
        if (stripeError) {
          console.error(stripeError.message)
        }
      } else {
        throw new Error('Settings not found')
      }
    } catch (error) {
      console.error('Error:', error)
      console.error("Failed to start checkout process")
    }
  }

  // Fetch website settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsSettingsLoading(true);
        const { data: settingsData, error: settingsError } = await supabase
          .from('website_settings')
          .select('*')
          .single();

        if (settingsError) {
          console.error('Error loading settings:', settingsError);
          setError('Failed to load website settings');
          return;
        }

        setSettings(settingsData);

        // Parse theme colors if they exist
        if (settingsData.theme_colors) {
          try {
            const colors = typeof settingsData.theme_colors === 'string' 
              ? JSON.parse(settingsData.theme_colors) 
              : settingsData.theme_colors;
            setThemeColors(colors);
          } catch (e) {
            console.error('Error parsing theme colors:', e);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to load website settings');
      } finally {
        setIsSettingsLoading(false);
      }
    };

    loadSettings();
  }, [supabase]);

  // Check user session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(!!session)
    }
    checkSession()
  }, [supabase])

  // Helper function to check if a price has a trial period
  const getTrialInfo = (product: Stripe.Product): { hasTrial: boolean; trialDays?: number } | null => {
    if (!product.prices) return null;
    
    const price = product.prices.find((p) => {
      if (billingInterval === 'yearly') {
        return p.recurring?.interval === 'year';
      }
      if (billingInterval === 'monthly') {
        return p.recurring?.interval === 'month';
      }
      return p.type === 'one_time';
    });
    
    if (!price) return null;
    
    // Check if trial_period_days exists and is greater than 0
    if (price.recurring?.trial_period_days && price.recurring.trial_period_days > 0) {
      return {
        hasTrial: true,
        trialDays: price.recurring.trial_period_days
      };
    }
    
    return { hasTrial: false };
  };

  // Helper function to check if cache is valid
  const isCacheValid = () => {
    const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
    if (!timestamp) return false;
    
    const cachedTime = parseInt(timestamp, 10);
    const now = Date.now();
    
    return now - cachedTime < CACHE_DURATION;
  };

  // Helper function to get cached products
  const getCachedProducts = () => {
    const cachedData = localStorage.getItem(CACHE_KEY_PRODUCTS);
    if (!cachedData) return null;
    
    try {
      return JSON.parse(cachedData) as StripeProductWithAllPrices[];
    } catch (error) {
      console.error('Error parsing cached products:', error);
      return null;
    }
  };

  // Helper function to update cache
  const updateCache = (productsData: StripeProductWithAllPrices[]): void => {
    try {
      localStorage.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(productsData));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
    } catch (error) {
      console.error('Error caching products:', error);
    }
  };

  // Helper function to get price
  const getPrice = (product: StripeProductWithAllPrices): number | null => {
    const prices = getProductPrices(product);
    if (!prices.length) return null;
    
    const price = prices.find((p: Stripe.Price) => {
      if (billingInterval === 'yearly') {
        return p.recurring?.interval === 'year';
      }
      if (billingInterval === 'monthly') {
        return p.recurring?.interval === 'month';
      }
      // For lifetime, look for one_time price or null recurring
      return p.type === 'one_time' || p.recurring === null;
    });
    
    return price?.unit_amount ? price.unit_amount / 100 : null;
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Check cache first
        if (isCacheValid()) {
          const cachedProducts = getCachedProducts();
          if (cachedProducts) {
            // Transform the cached products to have the prices property
            const transformedProducts = cachedProducts.map((product: StripeProductWithAllPrices) => ({
              ...product,
              prices: product.all_prices
            }));
            setProducts(transformedProducts);
            setIsLoading(false);
            return;
          }
        }

        // If no cache or invalid, fetch from API
        const response = await fetch('/api/stripe/get-products');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const productsData = await response.json();
        
        // Store the original API response in cache
        updateCache(productsData);
        
        // Transform the products to have the prices property
        const transformedProducts = productsData.map((product: StripeProductWithAllPrices) => ({
          ...product,
          prices: product.all_prices
        }));
        setProducts(transformedProducts);
      } catch (error) {
        console.error('Error loading products:', error);
        setError('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [supabase]);

  // Check if any product has annual or lifetime pricing
  const showBillingToggle = products.some(hasAnnualPricing)
  const showLifetimeToggle = products.some(hasLifetimePricing)

  // Filter and sort products based on billing interval
  const filteredAndSortedProducts = [...products]
    .filter((product: StripeProductWithAllPrices) => {
      
      // Check if product is active
      if (!product.active) {
        return false;
      }
      
      // For yearly billing, only show products with annual prices
      if (billingInterval === 'yearly') {
        const hasAnnual = hasAnnualPricing(product);
        return hasAnnual;
      }
      // For monthly billing, show products with monthly prices
      if (billingInterval === 'monthly') {
        const prices = getProductPrices(product);
        const hasMonthly = prices.some((p: Stripe.Price) => p.recurring?.interval === 'month');
        return hasMonthly;
      }
      // For lifetime, show products with one-time prices or null recurring
      const prices = getProductPrices(product);
      const hasLifetime = prices.some((p: Stripe.Price) => p.type === 'one_time' || p.recurring === null);
      return hasLifetime;
    })
    .sort((a, b) => {
      const priceA = getPrice(a as StripeProductWithAllPrices) || 0;
      const priceB = getPrice(b as StripeProductWithAllPrices) || 0;
      return priceA - priceB;
    });

  // Show loading state if either products or settings are still loading
  if (isLoading || isSettingsLoading) {
    return <LoadingComponent />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <CardComponent className="w-full max-w-2xl text-center">
          <CardHeaderComponent>
            <CardTitleComponent>Error Loading Content</CardTitleComponent>
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
          </CardHeaderComponent>
          <CardContentComponent className="flex justify-center">
            <ButtonComponent onClick={() => window.location.reload()}>
              Try Again
            </ButtonComponent>
          </CardContentComponent>
        </CardComponent>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 pricing-page">
      <div className="text-center mx-auto mb-12" style={{ maxWidth: "100%" }}>
        {/* Billing Interval Toggle - Only show if any product has annual pricing */}
        {(showBillingToggle || showLifetimeToggle) && (
          <div className="inline-flex items-center rounded-full border p-1 mb-8">
            {showBillingToggle && (
              <>
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium',
                    billingInterval === 'monthly'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  Billed Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('yearly')}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium',
                    billingInterval === 'yearly'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  Billed Annually
                </button>
              </>
            )}
            {showLifetimeToggle && (
              <button
                onClick={() => setBillingInterval('lifetime')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium',
                  billingInterval === 'lifetime'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                )}
              >
                Lifetime
              </button>
            )}
          </div>
        )}
        
        {/* Calculate the number of pricing blocks to determine grid layout */}
        {(() => {
          // Count how many pricing blocks will be displayed
          const showFreeCreditsBlock = settings?.trial_credits && settings.trial_credits > 0 &&
            settings.trial_credits_pricing_page && !session;
          
          const visibleProductsCount = filteredAndSortedProducts.filter(product => 
            getPrice(product) !== null
          ).length;
          
          const totalBlocksCount = visibleProductsCount + (showFreeCreditsBlock ? 1 : 0);
          
          // Determine grid class based on count
          const gridClass = totalBlocksCount <= 3 
            ? "grid-cols-1 md:grid-cols-3" 
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
          
          return (
            <div className={`grid gap-6 mt-8 ${gridClass}`}>
              {/* Trial Credits Block */}
              {settings?.trial_credits && settings.trial_credits > 0 &&
                settings.trial_credits_pricing_page && !session && (
                <CardComponent className="flex flex-col justify-between">
                  <CardHeaderComponent>
                    <CardTitleComponent className="text-2xl font-bold">
                      Claim Your Free Credits
                    </CardTitleComponent>
                    <p className="text-muted-foreground">
                      Get {settings.trial_credits} Free Credits
                    </p>
                  </CardHeaderComponent>
                  <CardContentComponent className="flex flex-col flex-grow">
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
                      {session ? (
                        <ClaimCreditsButtonComponent 
                          className="w-full max-w-[175px]"
                          trialCredits={settings?.trial_credits}
                        />
                      ) : (
                        <ButtonComponent 
                          className="w-full max-w-[175px]"
                          asChild
                        >
                          <LinkComponent href="/auth">Get Started</LinkComponent>
                        </ButtonComponent>
                      )}
                    </div>
                  </CardContentComponent>
                </CardComponent>
              )}

              {/* Product Cards */}
              {filteredAndSortedProducts.map((product) => {
                const price = getPrice(product)
                if (price === null) return null // Skip products without a price for current interval
                
                const features = getAllFeatures(product)
                const isPopular = product.metadata.popular === 'true'
                const currentInterval = product.prices?.find((p: any) => 
                  billingInterval === 'yearly' ? p.recurring?.interval === 'year' : p.recurring?.interval === 'month'
                )?.recurring?.interval
                
                // Get trial information
                const trialInfo = getTrialInfo(product);

                return (
                  <CardComponent 
                    key={product.id}
                    className={cn(
                      "flex flex-col h-full",
                      product.metadata.featured === "true" && "border-primary"
                    )}
                  >
                    <CardHeaderComponent className="flex-none">
                      <div className="flex justify-center items-start">
                        <CardTitleComponent className="text-xl text-center">{product.name}</CardTitleComponent>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">{product.description}</p>
                      {trialInfo?.hasTrial && (
                        <div className="mt-4 mx-auto max-w-[250px] py-3 px-4 text-center border border-[#d8d8d8] rounded-md">
                          <span className="text-base font-medium" style={{ color: themeColors?.primary }}>
                            {trialInfo.trialDays} Day Free Trial
                          </span>
                        </div>
                      )}
                    </CardHeaderComponent>
                    <CardContentComponent className="flex-1 flex flex-col">
                      <div className="mb-6">
                        <span className="text-4xl font-bold">${price.toLocaleString()}</span>
                        <span className="text-muted-foreground">
                          {billingInterval === 'lifetime' ? '' : currentInterval ? `/${currentInterval}` : ''}
                        </span>
                      </div>

                      <div className="flex flex-col items-center mb-6">
                        <ButtonComponent 
                          className="w-full max-w-[175px]"
                          style={{
                            backgroundColor: isPopular ? themeColors?.primary : undefined,
                            borderColor: !isPopular ? themeColors?.primary : undefined,
                            color: isPopular ? themeColors?.secondary : themeColors?.primary
                          }}
                          variant={isPopular ? "default" : "outline"}
                          onClick={session ? () => handleGetStarted(product) : () => window.location.href = '/auth'}
                        >
                          {trialInfo?.hasTrial ? 'Start Free Trial' : (session ? 'Get Started' : 'Create Account')}
                        </ButtonComponent>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-center mb-3">What&apos;s included:</p>
                        <div className="space-y-2 text-left">
                          {features.map((feature, index) => (
                            <div key={index} className="flex items-start text-sm">
                              <CheckComponent className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-primary" style={{ color: themeColors?.primary }} />
                              <span className="flex-1">
                                <FeatureWithTooltip feature={feature} />
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Credits Rollover Status */}
                      {product.metadata.credits && product.metadata.credits !== '0' && (
                        <div className="mt-4 pt-4 border-t text-left">
                          <div className="flex items-start text-sm">
                            {billingInterval === 'lifetime' ? (
                              <>
                                <CheckComponent className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                                <span className="flex-1 text-green-600">Credits Rollover Each Month</span>
                              </>
                            ) : product.metadata.credits_rollover === 'true' ? (
                              <>
                                <CheckComponent className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                                <span className="flex-1 text-green-600">Credits Rollover Each Month</span>
                              </>
                            ) : product.metadata.credits_rollover === 'false' ? (
                              <>
                                <XComponent className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                                <span className="flex-1 text-red-600">Credits DO NOT Rollover</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Free Trial Label */}
                      {settings && product.metadata.allow_trial === 'true' && (
                        <div className="absolute top-0 right-0 -mt-3 -mr-3">
                          <span className="bg-green-500 text-white text-xs py-1 px-2 rounded-full">
                            Free Trial
                          </span>
                        </div>
                      )}
                    </CardContentComponent>
                  </CardComponent>
                )
              })}
            </div>
          );
        })()}
      </div>
      
      {/* Display raw API response in maintenance mode for admins */}
      {settings?.maintenance_mode && isAdmin && (
        <CardComponent className="mt-8">
          <CardHeaderComponent>
            <CardTitleComponent>Raw API Response</CardTitleComponent>
          </CardHeaderComponent>
          <CardContentComponent>
            <pre className="bg-slate-100 p-4 rounded-lg overflow-auto max-h-[500px] text-sm">
              {JSON.stringify(products, null, 2)}
            </pre>
          </CardContentComponent>
        </CardComponent>
      )}
    </div>
  )
} 