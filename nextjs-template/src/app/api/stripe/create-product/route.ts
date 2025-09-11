import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

interface MarketingFeature {
  feature: string
}

interface PriceData {
  amount: number
  payment_type: 'one_time' | 'recurring'
  billing_period?: 'monthly' | 'yearly'
  is_default: boolean
  has_trial?: boolean
  trial_period_days?: number
  trial_requires_payment_method?: boolean
  trial_end_behavior?: 'cancel' | 'pause'
}

interface ProductData {
  name: string
  description?: string
  image?: string
  product_tax_code?: string
  statement_descriptor?: string
  credits?: number
  credits_rollover?: boolean
  marketing_features: MarketingFeature[]
  prices: PriceData[]
  include_tax: 'yes' | 'no' | 'unspecified'
}

export async function POST(req: Request) {
  try {
    // Get Stripe secret key from website settings
    const supabase = await createClient()
    const { data: settings, error: settingsError } = await supabase
      .from('website_settings')
      .select('stripe_secret_key')
      .single()

    if (settingsError || !settings?.stripe_secret_key) {
      return NextResponse.json(
        { error: 'Stripe secret key not configured' },
        { status: 400 }
      )
    }

    const stripe = new Stripe(settings.stripe_secret_key, {
      apiVersion: '2025-04-30.basil',
    })

    const productData: ProductData = await req.json()

    // Create the product
    const product = await stripe.products.create({
      name: productData.name,
      description: productData.description,
      images: productData.image ? [productData.image] : undefined,
      tax_code: productData.product_tax_code,
      statement_descriptor: productData.statement_descriptor,
      metadata: {
        ...(typeof productData.credits === 'number' ? { credits: productData.credits.toString() } : {}),
        ...(typeof productData.credits_rollover === 'boolean' ? { credits_rollover: productData.credits_rollover.toString() } : {}),
        ...productData.marketing_features.reduce((acc: Record<string, string>, feature: MarketingFeature, index: number) => ({
          ...acc,
          [`marketing_feature_${index + 1}`]: feature.feature
        }), {})
      }
    })

    // Create all prices
    const prices = await Promise.all(productData.prices.map(async (priceData: PriceData) => {
      // Convert price to cents (multiply by 100 and ensure whole number)
      const unitAmount = Math.round(priceData.amount * 100)
      
      return stripe.prices.create({
        unit_amount: unitAmount,
        currency: 'usd',
        product: product.id,
        tax_behavior: productData.include_tax === 'yes' ? 'inclusive' as const : 
                     productData.include_tax === 'no' ? 'exclusive' as const : 
                     'unspecified' as const,
        ...(priceData.payment_type === 'recurring' ? {
          recurring: {
            interval: priceData.billing_period === 'yearly' ? 'year' : 'month',
            ...(priceData.has_trial && priceData.trial_period_days ? {
              trial_period_days: priceData.trial_period_days
            } : {})
          }
        } : {})
      })
    }))

    // Set the default price
    const defaultPrice = prices.find((price: Stripe.Price, index: number) => 
      productData.prices[index].is_default
    )

    if (defaultPrice) {
      await stripe.products.update(product.id, {
        default_price: defaultPrice.id
      })
    }

    return NextResponse.json({ 
      product: {
        ...product,
        default_price: defaultPrice
      }, 
      prices 
    })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
} 