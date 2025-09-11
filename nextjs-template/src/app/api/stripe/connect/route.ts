import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST() {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
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
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-04-30.basil',
    })

    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
    })

    // Save the account ID to the user's data
    const { error: updateError } = await supabase
      .from("user_data")
      .update({ stripe_connected_account_id: account.id })
      .eq("UID", user.id)

    if (updateError) {
      throw updateError
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/affiliate-dashboard`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/affiliate-dashboard`,
      type: "account_onboarding",
    })

    return new NextResponse(
      JSON.stringify({ url: accountLink.url }),
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error in Stripe Connect:", error)
    const errorMessage = error instanceof Stripe.errors.StripeError 
      ? error.message 
      : error instanceof Error 
        ? error.message 
        : 'An unknown error occurred'
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
} 