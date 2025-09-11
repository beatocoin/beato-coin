import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET() {
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

    // Fetch all products with their prices
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
      limit: 100,
    })

    // Fetch all prices for each product
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 100,
        })

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          images: product.images,
          active: product.active,
          default_price: product.default_price,
          all_prices: prices.data.map(price => ({
            id: price.id,
            unit_amount: price.unit_amount,
            recurring: price.recurring ? {
              interval: price.recurring.interval,
              interval_count: price.recurring.interval_count,
            } : null,
          })),
          metadata: product.metadata,
        }
      })
    )

    return NextResponse.json(productsWithPrices)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
} 