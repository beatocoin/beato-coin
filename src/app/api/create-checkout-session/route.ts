import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

// Define a type that includes the newer API version
type StripeApiVersion = '2025-04-30.basil' | '2023-10-16' | '2023-08-16' | '2022-11-15';

export async function POST(req: Request) {
  try {
    const { priceId, metadata } = await req.json()
    const supabase = await createClient()

    // Get the user's session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get website settings
    const { data: settings, error: settingsError } = await supabase
      .from('website_settings')
      .select('stripe_secret_key')
      .single()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
    }

    // Use settings from database or fall back to environment variables
    const stripeSecretKey = settings?.stripe_secret_key || process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe secret key not configured' },
        { status: 500 }
      )
    }

    // Initialize Stripe with the secret key
    // Using a type assertion for the API version since it's a newer version
    // that might not be included in the current type definitions
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-04-30.basil',
    })

    // Default to localhost:3000 for local development if NEXT_PUBLIC_SITE_URL is not set
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // Create the checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${siteUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: {
        ...metadata,
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id
        }
      }
    })

    return NextResponse.json({ sessionId: checkoutSession.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 