import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'
import { SupabaseClient } from '@supabase/supabase-js'

interface StripeTransaction {
  transaction_id: string
  status: 'active' | 'one-off'
  event_id: string
  id: string
  name: string
  price: string
  interval: string
  last_payment: string
}

async function getStripeCredentials() {
  try {
    const supabase = await createClient()
    const { data: settings, error } = await supabase
      .from('website_settings')
      .select('stripe_secret_key, stripe_webhook_secret')
      .single()

    if (error || !settings) {
      console.warn('Failed to get Stripe credentials from database, falling back to environment variables')
      return {
        secretKey: process.env.STRIPE_SECRET_KEY!,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!
      }
    }

    return {
      secretKey: settings.stripe_secret_key || process.env.STRIPE_SECRET_KEY!,
      webhookSecret: settings.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET!
    }
  } catch (error) {
    console.error('Error getting Stripe credentials:', error)
    return {
      secretKey: process.env.STRIPE_SECRET_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!
    }
  }
}

async function updateTransactionArray(
  supabase: SupabaseClient,
  userId: string,
  newTransaction: StripeTransaction,
  isNewTransaction: boolean = true
) {
  // First get the current array
  const { data: userData, error: fetchError } = await supabase
    .from('user_data')
    .select('stripe_id')
    .eq('UID', userId)
    .single()

  if (fetchError) {
    console.error('Error fetching user data:', fetchError)
    throw fetchError
  }

  let transactionArray = userData?.stripe_id || []
  if (typeof transactionArray === 'string') {
    // Handle legacy data where stripe_id was a string
    transactionArray = []
  }

  if (isNewTransaction) {
    // Add new transaction to array
    transactionArray.push(newTransaction)
  } else {
    // Update existing transaction
    const index = transactionArray.findIndex((t: StripeTransaction) => 
      t.transaction_id === newTransaction.transaction_id
    )
    if (index >= 0) {
      transactionArray[index] = { ...transactionArray[index], ...newTransaction }
    } else {
      // If not found, add as new
      transactionArray.push(newTransaction)
    }
  }

  // Update the database
  const { error: updateError } = await supabase
    .from('user_data')
    .update({ stripe_id: transactionArray })
    .eq('UID', userId)

  if (updateError) {
    console.error('Error updating transaction array:', updateError)
    throw updateError
  }

  return transactionArray
}

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature') ?? ''

  // Get Stripe credentials
  const { secretKey, webhookSecret } = await getStripeCredentials()
  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-04-30.basil',
  })

  let event: Stripe.Event

  try {
    if (!signature) throw new Error('No signature provided')
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (!userId) {
          console.error('No userId found in session metadata')
          break
        }

        // Get complete product information
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
        if (!lineItems.data.length || !lineItems.data[0].price?.id) {
          console.error('No line items or price found in session')
          break
        }
        const price = await stripe.prices.retrieve(lineItems.data[0].price.id)
        if (!price.product) {
          console.error('No product found in price')
          break
        }
        const product = await stripe.products.retrieve(price.product as string)

        // Create transaction object
        const transaction: StripeTransaction = {
          transaction_id: session.id,
          status: session.mode === 'subscription' ? 'active' : 'one-off',
          event_id: event.id,
          id: product.id,
          name: product.name,
          price: (session.amount_total ? session.amount_total / 100 : 0).toString(),
          interval: session.mode === 'subscription' 
            ? (price.recurring?.interval || 'month') 
            : 'one-off',
          last_payment: new Date(session.created * 1000).toISOString()
        }

        // Update transaction array
        await updateTransactionArray(supabase, userId, transaction)

        // Update credits if applicable
        if (product.metadata?.credits) {
          const credits = parseInt(product.metadata.credits)
          if (credits) {
            const { data: userData, error: fetchError } = await supabase
              .from('user_data')
              .select('user_role')
              .eq('UID', userId)
              .single()

            if (fetchError) {
              console.error('Error fetching user data:', fetchError)
              throw fetchError
            }

            // Only update role if user is not admin
            const updateData = userData?.user_role === 'admin'
              ? { credits }
              : { credits, user_role: product.name }

            const { error: updateError } = await supabase
              .from('user_data')
              .update(updateData)
              .eq('UID', userId)

            if (updateError) {
              console.error('Error updating user data:', updateError)
              throw updateError
            }
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Only process subscription invoices
        if (!invoice.subscription) break

        // Get the subscription details
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const userId = subscription.metadata.userId

        if (!userId) {
          console.error('No userId found in subscription metadata')
          break
        }

        // Get the product details
        const product = await stripe.products.retrieve(subscription.items.data[0].price.product as string)
        const price = subscription.items.data[0].price

        // Create/update transaction object
        const transaction: StripeTransaction = {
          transaction_id: subscription.id,
          status: 'active',
          event_id: event.id,
          id: product.id,
          name: product.name,
          price: (invoice.amount_paid / 100).toString(),
          interval: price.recurring?.interval || 'month',
          last_payment: new Date(invoice.created * 1000).toISOString()
        }

        // Update transaction array
        await updateTransactionArray(supabase, userId, transaction, false)

        // Handle credits update
        if (product.metadata?.credits) {
          const newCredits = parseInt(product.metadata.credits)
          const creditsRollover = product.metadata.credits_rollover === 'true'

          const { data: userData, error: fetchError } = await supabase
            .from('user_data')
            .select('credits, user_role')
            .eq('UID', userId)
            .single()

          if (fetchError) {
            console.error('Error fetching user data:', fetchError)
            throw fetchError
          }

          const updatedCredits = creditsRollover
            ? (userData?.credits || 0) + newCredits
            : newCredits

          const { error: updateError } = await supabase
            .from('user_data')
            .update({ credits: updatedCredits })
            .eq('UID', userId)

          if (updateError) {
            console.error('Error updating user credits:', updateError)
            throw updateError
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.userId

        if (!userId) {
          console.error('No userId found in subscription metadata')
          break
        }

        // For the third instance, we need to add the missing properties
        const transaction: StripeTransaction = {
          transaction_id: subscription.id,
          status: 'one-off', // Changed from 'inactive' to 'one-off' to match the allowed values
          event_id: event.id || '',
          id: subscription.id,
          name: 'Cancelled Subscription',
          price: '0',
          interval: 'month',
          last_payment: new Date().toISOString()
        }

        // Update transaction array
        await updateTransactionArray(supabase, userId, transaction, false)

        // Update user role if not admin
        const { data: userData, error: fetchError } = await supabase
          .from('user_data')
          .select('user_role')
          .eq('UID', userId)
          .single()

        if (fetchError) {
          console.error('Error fetching user data:', fetchError)
          throw fetchError
        }

        if (userData?.user_role !== 'admin') {
          const { error: updateError } = await supabase
            .from('user_data')
            .update({ user_role: 'free subscriber' })
            .eq('UID', userId)

          if (updateError) {
            console.error('Error updating user role:', updateError)
            throw updateError
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
} 