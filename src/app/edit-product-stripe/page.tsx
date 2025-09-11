"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { ProductForm } from "@/components/CreateProductForm"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import * as z from "zod"
// import { toast } from "sonner"
import { toast } from "@/utils/toast"

// Cache keys (same as in products page)
const CACHE_KEY_PRODUCTS = 'stripe_products_cache'
const CACHE_KEY_TIMESTAMP = 'stripe_products_cache_timestamp'

// Form schema
const priceSchema = z.object({
  id: z.string().optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  payment_type: z.enum(["recurring", "one-off"]),
  billing_period: z.union([
    z.enum(["monthly", "yearly"]),
    z.undefined(),
    z.null()
  ]).optional(),
  is_default: z.boolean().default(false),
  has_trial: z.boolean().default(false),
  trial_period_days: z.number().min(1, "Trial period must be at least 1 day").optional(),
  trial_requires_payment_method: z.boolean().default(true),
  trial_end_behavior: z.enum(["cancel", "pause"]).default("cancel").optional()
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
  | { id?: string; payment_type: "recurring"; billing_period: "monthly" | "yearly"; amount: number; is_default: boolean; has_trial: boolean; trial_requires_payment_method: boolean; trial_period_days?: number; trial_end_behavior?: "cancel" | "pause"; }
  | { id?: string; payment_type: "one-off"; amount: number; is_default: boolean; has_trial: boolean; trial_requires_payment_method: boolean; trial_period_days?: number; trial_end_behavior?: "cancel" | "pause"; billing_period?: undefined; };

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
  credits_rollover: z.boolean().default(false),
  pricesToReactivate: z.array(z.string()).optional()
})

type ProductFormValues = z.infer<typeof productFormSchema>
// But override the prices type to use our discriminated union
type ProductFormValuesWithCorrectPrices = Omit<z.infer<typeof productFormSchema>, 'prices'> & {
  prices: PriceType[];
  pricesToReactivate?: string[];
}

interface ProductData {
  id: string;
  name: string;
  description: string;
  images?: string[];
  statement_descriptor?: string;
  marketing_features?: { feature: string }[];
  metadata?: {
    credits?: string;
    credits_rollover?: string;
  };
  active?: boolean;
  default_price?: {
    id: string;
    unit_amount: number;
    type: 'recurring' | 'one-time';
    recurring?: {
      interval: 'month' | 'year';
    };
  };
  all_prices?: Array<{
    id: string;
    unit_amount: number;
    recurring?: {
      interval: 'month' | 'year';
    };
  }>;
}

export default function EditProductPage() {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [productData, setProductData] = useState<ProductData | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [devMode, setDevMode] = useState(false)

  useEffect(() => {
    // Get product ID from URL
    const params = new URLSearchParams(window.location.search)
    const id = params.get('product_id')
    setProductId(id)

    if (!id) {
      setError('Product ID is required')
      setIsLoading(false)
      return
    }
  }, [])

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

        setIsAdmin(true)

        // Check if website_settings table exists and is configured
        const { data: settingsData, error: settingsError } = await supabase
          .from('website_settings')
          .select('stripe_publishable_key, stripe_secret_key, stripe_webhook_secret, maintenance_mode')
          .single()

        if (settingsError || !settingsData?.stripe_publishable_key || 
            !settingsData?.stripe_secret_key || !settingsData?.stripe_webhook_secret) {
          setError('setup_required')
          setIsLoading(false)
          return
        }

        setDevMode(settingsData?.maintenance_mode || false)

        // Fetch product data if we have a product ID
        if (productId) {
          try {
            const response = await fetch(`/api/stripe/get-product?product_id=${productId}`);
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to fetch product');
            }
            
            const product = await response.json();
            setProductData(product);
          } catch (error) {
            console.error('Error fetching product:', error);
            setError(error instanceof Error ? error.message : 'Failed to fetch product');
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error:', error)
        setError('An error occurred while checking user access')
        setIsLoading(false)
      }
    }

    checkUser()
  }, [supabase, productId])

  const handleSubmit = async (data: ProductFormValuesWithCorrectPrices) => {
    try {
      
      // Add the product ID to the data
      const updatedData = {
        ...data,
        id: productId
      };

      const response = await fetch('/api/stripe/update-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        toast.error(`Failed to update product: ${errorData.error || "An unknown error occurred"}`);
        return; // Don't throw, just return
      }
      
      const responseData = await response.json();

      // Clear the product cache from localStorage
      localStorage.removeItem(CACHE_KEY_PRODUCTS);
      localStorage.removeItem(CACHE_KEY_TIMESTAMP);
      
      toast.success("Product updated successfully");
      window.location.href = '/products';
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(`Failed to update product: ${error instanceof Error ? error.message : "An unknown error occurred"}`);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
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
        {productData ? (
          <ProductForm
            mode="edit"
            initialData={productData}
            onSubmit={handleSubmit as any}
          />
        ) : (
          <div className="flex justify-center items-center p-8">
            <p>Retrieving Product Data From Stripe ...</p>
          </div>
        )}
        
        {devMode && isAdmin && productData && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Raw API Response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-100 p-4 rounded-lg overflow-auto max-h-[500px] text-sm">
                {JSON.stringify(productData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 