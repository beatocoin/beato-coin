import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import Stripe from "stripe"

interface AffiliateTransaction {
  id: string
  commission_amount: number
  affiliate: {
    stripe_connected_account_id: string | null
  } | null
}

interface TransactionResult {
  transactionId: string
  status: "success" | "error"
  transferId?: string
  error?: string
}

export async function POST(request: Request) {
  try {
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-04-30.basil",
    })

    // Get the authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const { data: userData, error: userDataError } = await supabase
      .from("user_data")
      .select("user_role")
      .eq("UID", user.id)
      .single()

    if (userDataError || userData?.user_role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get transaction IDs from request body
    const { transactionIds } = await request.json()

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid transaction IDs" },
        { status: 400 }
      )
    }

    // Get transactions with affiliate data
    const { data: transactions, error: transactionsError } = await supabase
      .from("affiliate_transactions")
      .select(`
        *,
        affiliate:affiliate_id (
          stripe_connected_account_id:user_data(stripe_connected_account_id)
        )
      `)
      .in("id", transactionIds)
      .eq("status", "pending")

    if (transactionsError) {
      throw transactionsError
    }

    // Process each transaction
    const results: TransactionResult[] = await Promise.all(
      (transactions as AffiliateTransaction[]).map(async (transaction) => {
        try {
          const stripeAccountId = transaction.affiliate?.stripe_connected_account_id

          if (!stripeAccountId) {
            throw new Error("Affiliate has no connected Stripe account")
          }

          // Create a transfer to the affiliate's connected account
          const transfer = await stripe.transfers.create({
            amount: Math.round(transaction.commission_amount * 100), // Convert to cents
            currency: "usd",
            destination: stripeAccountId,
            description: `Affiliate commission for transaction ${transaction.id}`,
          })

          // Update transaction status to paid
          const { error: updateError } = await supabase
            .from("affiliate_transactions")
            .update({ 
              status: "paid",
              payout_id: transfer.id,
              paid_at: new Date().toISOString()
            })
            .eq("id", transaction.id)

          if (updateError) {
            throw updateError
          }

          return {
            transactionId: transaction.id,
            status: "success",
            transferId: transfer.id,
          }
        } catch (error) {
          console.error(`Error processing transaction ${transaction.id}:`, error)
          return {
            transactionId: transaction.id,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
      })
    )

    // Count successful and failed transactions
    const successful = results.filter((r) => r.status === "success").length
    const failed = results.filter((r) => r.status === "error").length

    return NextResponse.json({
      message: `Processed ${successful} payout(s) successfully. ${failed} failed.`,
      results,
    })
  } catch (error) {
    console.error("Error processing payouts:", error)
    return NextResponse.json(
      { error: "Failed to process payouts" },
      { status: 500 }
    )
  }
} 