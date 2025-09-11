import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get the user's session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { message: 'Not authenticated' },
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
        { message: 'Stripe secret key not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-04-30.basil',
    })

    // Get the customer from Stripe using the user's UUID
    const customers = await stripe.customers.search({
      query: `metadata['supabaseUUID']:'${user.id}'`,
    })

    if (!customers.data || customers.data.length === 0) {
      return NextResponse.json(
        { message: 'No subscription found' },
        { status: 404 }
      )
    }

    // Get all subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      expand: ['data.default_payment_method', 'data.items.data.price.product'],
      limit: 1,
    })

    if (!subscriptions.data || subscriptions.data.length === 0) {
      return NextResponse.json(
        { message: 'No active subscription found' },
        { status: 404 }
      )
    }

    const subscription = subscriptions.data[0]
    const product = subscription.items.data[0].price.product as Stripe.Product
    const price = subscription.items.data[0].price

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      last_payment: subscription.current_period_start,
      product: {
        name: product.name,
        description: product.description,
      },
      price: {
        unit_amount: price.unit_amount ? price.unit_amount / 100 : 0,
        recurring: price.recurring ? {
          interval: price.recurring.interval,
        } : undefined,
      },
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
} 