"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { ProductForm } from "@/components/CreateProductForm"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import * as z from "zod"
import { toast } from "@/utils/toast"

// Cache keys (same as in products page)
const CACHE_KEY_PRODUCTS = 'stripe_products_cache'
const CACHE_KEY_TIMESTAMP = 'stripe_products_cache_timestamp'

// Form schema
const priceSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  payment_type: z.enum(["recurring", "one-off"]),
  billing_period: z.union([
    z.enum(["monthly", "yearly"]),
    z.undefined(),
    z.null()
  ]).optional(),
  is_default: z.boolean().default(false)
}).refine(data => {
  // If payment_type is recurring, billing_period is required
  if (data.payment_type === "recurring") {
    return !!data.billing_period;
  }
  // For one-off payments, billing_period is not required
  return true;
}, {
  message: "Billing period is required for recurring payments",
  path: ["billing_period"]
});

// Create a discriminated union type for prices based on payment_type
type PriceType = 
  | { payment_type: "recurring"; billing_period: "monthly" | "yearly"; amount: number; is_default: boolean; }
  | { payment_type: "one-off"; amount: number; is_default: boolean; billing_period?: undefined; };

// This helps TypeScript understand that billing_period can be completely absent
const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().optional(),
  active: z.boolean().default(true),
  product_tax_code: z.string().default("txcd_10000000"),
  statement_descriptor: z.string().max(22, "Statement descriptor must be 22 characters or less"),
  marketing_features: z.array(
    z.object({
      feature: z.string()
    })
  ).default([]),
  prices: z.array(priceSchema).min(1, "At least one price is required"),
  include_tax: z.enum(["auto", "yes", "no"]),
  credits: z.number().min(0, "Credits must be 0 or greater").optional(),
  credits_rollover: z.boolean().default(false)
})

type ProductFormValues = z.infer<typeof productFormSchema>
// But override the prices type to use our discriminated union
type ProductFormValuesWithCorrectPrices = Omit<z.infer<typeof productFormSchema>, 'prices'> & {
  prices: PriceType[];
  pricesToReactivate?: string[];
}

export default function CreateProductPage() {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Check if user is logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          window.location.href = '/auth'
          return
        }

        // Check if user is admin
        const { data: userData, error: userDataError } = await supabase
          .from('user_data')
          .select('user_role')
          .eq('UID', user.id)
          .single()

        if (userDataError || userData?.user_role !== 'admin') {
          window.location.href = '/dashboard'
          return
        }

        // Check if website_settings table exists and is configured
        const { data: settingsData, error: settingsError } = await supabase
          .from('website_settings')
          .select('stripe_publishable_key, stripe_secret_key, stripe_webhook_secret')
          .single()

        if (settingsError || 
            !settingsData?.stripe_publishable_key || !settingsData?.stripe_secret_key || 
            !settingsData?.stripe_webhook_secret) {
          setError('setup_required')
          return
        }
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      }
    }

    checkUser()
  }, [supabase])

  const handleSubmit = async (data: ProductFormValuesWithCorrectPrices) => {
    try {
      const response = await fetch('/api/stripe/create-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create product');
      }

      // Clear the product cache from localStorage
      localStorage.removeItem(CACHE_KEY_PRODUCTS);
      localStorage.removeItem(CACHE_KEY_TIMESTAMP);
      
      toast.success("Product created successfully");
      window.location.href = '/products';
      
      return await response.json();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(`Failed to create product: ${error instanceof Error ? error.message : "An unknown error occurred"}`);
      throw error;
    }
  }

  if (error) {
    if (error === 'setup_required') {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-6">Website Setup Required</h1>
          <p className="mb-8 text-lg">
            Please complete Steps 1, 2, 3 and 4 on the <Link href="/website-setup" className="text-blue-500 hover:text-blue-600 underline">Website Setup</Link> Page to view and start creating Subscription Products.
          </p>
          <Button asChild>
            <Link href="/website-setup">
              Website Setup
            </Link>
          </Button>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-2xl text-center">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/products">
            <Button variant="outline">Back to Products</Button>
          </Link>
        </div>
        <ProductForm
          mode="create"
          onSubmit={handleSubmit as any}
        />
      </div>
    </div>
  )
} 