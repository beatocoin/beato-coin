import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET(req: Request) {
  try {
    // Get product ID from URL
    const url = new URL(req.url)
    const productId = url.searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

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

    // Fetch the product
    const product = await stripe.products.retrieve(productId, {
      expand: ['default_price'],
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Fetch all prices for the product
    const prices = await stripe.prices.list({
      product: productId,
      limit: 100,
    })

    // Extract marketing features from metadata
    const marketingFeatures = Object.entries(product.metadata || {})
      .filter(([key]) => key.startsWith('marketing_feature_'))
      .map(([_, value]) => ({ feature: value as string }))
      .filter(item => item.feature.trim() !== '')

    // Return the raw product data with minimal transformations
    return NextResponse.json({
      id: product.id,
      name: product.name,
      description: product.description,
      images: product.images,
      active: product.active,
      statement_descriptor: product.statement_descriptor,
      default_price: product.default_price,
      all_prices: prices.data.map(price => ({
        ...price,
        active: price.active
      })),
      metadata: product.metadata,
      marketing_features: marketingFeatures
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
} 