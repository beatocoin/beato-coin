import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

type StripeCustomer = Stripe.Customer & {
  metadata: {
    supabaseUUID: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new Error('Missing Stripe secret key')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-04-30.basil',
    })

    const customers = (await stripe.customers.search({
      query: `metadata['supabaseUUID']:'${user.id}'`,
    })).data as StripeCustomer[]

    if (!customers || customers.length === 0) {
      return new NextResponse('Customer not found', { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers[0].id,
      return_url: `${req.nextUrl.origin}/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('Error creating portal session:', error)
    return new NextResponse(error instanceof Error ? error.message : 'Internal Server Error', { status: 500 })
  }
} 