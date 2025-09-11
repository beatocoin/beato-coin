"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/utils/toast"
import Loading from "@/components/ui/loading"
import Stripe from 'stripe'
import { Loader2 } from 'lucide-react'

// Cache keys (same as in pricing page)
const CACHE_KEY_PRODUCTS = 'stripe_products_cache'
const CACHE_KEY_TIMESTAMP = 'stripe_products_cache_timestamp'

// Simple type assertions to fix build issues with Next.js 15.2.1
const LoadingComponent = Loading as any
const CardComponent = Card as any
const CardHeaderComponent = CardHeader as any
const CardTitleComponent = CardTitle as any
const CardContentComponent = CardContent as any
const ButtonComponent = Button as any
const LinkComponent = Link as any
const TableComponent = Table as any
const TableHeaderComponent = TableHeader as any
const TableRowComponent = TableRow as any
const TableHeadComponent = TableHead as any
const TableBodyComponent = TableBody as any
const TableCellComponent = TableCell as any
const ImageComponent = Image as any
const Loader2Component = Loader2 as any

interface Price {
  id: string
  unit_amount: number | null
  recurring?: {
    interval: string
    interval_count: number
  } | null
}

interface Product {
  id: string
  name: string
  images?: string[]
  default_price?: Price | null
  all_prices: Price[]
  active: boolean
  metadata?: {
    credits?: string
    credits_rollover?: string
  }
}

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [themeColors, setThemeColors] = useState<any>(null)
  const [isClearingCache, setIsClearingCache] = useState(false)

  useEffect(() => {
    const loadProducts = async () => {
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
          .select('maintenance_mode, theme_colors')
          .single()

        if (settingsError) {
          setError('setup_required')
          setIsLoading(false)
          return
        }

        // Parse theme colors
        if (settingsData.theme_colors) {
          try {
            const colors = typeof settingsData.theme_colors === 'string' 
              ? JSON.parse(settingsData.theme_colors) 
              : settingsData.theme_colors
            setThemeColors(colors)
          } catch (e) {
            console.error('Error parsing theme colors:', e)
          }
        }

        setDevMode(settingsData?.maintenance_mode || false)

        // Fetch products from our API
        const response = await fetch('/api/stripe/get-products')
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch products')
        }

        const productsData = await response.json()
        setProducts(productsData)
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [supabase])

  const handleDeleteProduct = async (productId: string, productName: string) => {
    try {
      const { data: settings } = await supabase
        .from('website_settings')
        .select('stripe_secret_key')
        .single()

      if (!settings?.stripe_secret_key) {
        throw new Error('Stripe configuration required')
      }

      const stripe = new Stripe(settings.stripe_secret_key, {
        apiVersion: '2025-04-30.basil',
      })

      // First, fetch ALL prices for this product
      const prices = await stripe.prices.list({
        product: productId,
        limit: 100
      })

      // Deactivate all prices first
      try {
        // Use Promise.all to deactivate all prices concurrently
        await Promise.all(prices.data.map(async (price: Stripe.Price) => {
        }))

        // Verify all prices are inactive before proceeding
        const verifyPrices = await stripe.prices.list({
          product: productId,
          active: true,
          limit: 100
        })

        if (verifyPrices.data.length > 0) {
          throw new Error('Some prices are still active. Please try again.')
        }

        // Now that we've confirmed all prices are inactive, delete the product
        await stripe.products.del(productId)
        
        // Update the local state to remove the deleted product
        setProducts(products.filter(product => product.id !== productId))
        
        toast.success(`Product Successfully Deleted: ${productName}`)
      } catch (error) {
        console.error('Error during deletion process:', error)
        throw error
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error(`Failed to delete product: ${error instanceof Error ? error.message : 'An error occurred'}`)
    }
  }

  const handleClearCache = async () => {
    try {
      setIsClearingCache(true)
      
      // Clear the cache from localStorage
      localStorage.removeItem(CACHE_KEY_PRODUCTS)
      localStorage.removeItem(CACHE_KEY_TIMESTAMP)
      
      // Wait a moment to show the spinner (for UX purposes)
      await new Promise(resolve => setTimeout(resolve, 800))
      
      toast.success('Product cache cleared successfully')
    } catch (error) {
      console.error('Error clearing cache:', error)
      toast.error('Failed to clear product cache')
    } finally {
      setIsClearingCache(false)
    }
  }

  if (isLoading) {
    return <LoadingComponent />
  }

  if (error) {
    if (error === 'setup_required') {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-6">Website Setup Required</h1>
          <p className="mb-8 text-lg">
            Please complete Steps 1, 2 and 3 on the <LinkComponent href="/website-setup" className="text-blue-500 hover:text-blue-600 underline">Website Setup</LinkComponent> Page to view and start creating Subscription Products.
          </p>
          <ButtonComponent asChild>
            <LinkComponent href="/website-setup">
              Website Setup
            </LinkComponent>
          </ButtonComponent>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <CardComponent className="w-full max-w-2xl text-center">
          <CardHeaderComponent>
            <CardTitleComponent>Error</CardTitleComponent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardHeaderComponent>
        </CardComponent>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Products</h1>
          <div className="flex space-x-4">
            <LinkComponent href="/create-product-stripe">
              <ButtonComponent>Create Product</ButtonComponent>
            </LinkComponent>
            <ButtonComponent 
              onClick={handleClearCache}
              disabled={isClearingCache}
              style={{ backgroundColor: themeColors?.dark || '#233D4D' }}
            >
              {isClearingCache ? (
                <>
                  <Loader2Component className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : 'Clear Product Cache'}
            </ButtonComponent>
          </div>
        </div>
        <CardComponent className="text-center p-8">
          <CardContentComponent>
            <p className="text-muted-foreground">No products found. Create your first product to get started.</p>
          </CardContentComponent>
        </CardComponent>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Products</h1>
        <div className="flex space-x-4">
          <LinkComponent href="/create-product-stripe">
            <ButtonComponent>Create Product</ButtonComponent>
          </LinkComponent>
          <ButtonComponent 
            onClick={handleClearCache}
            disabled={isClearingCache}
            style={{ backgroundColor: themeColors?.dark || '#233D4D' }}
          >
            {isClearingCache ? (
              <>
                <Loader2Component className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : 'Clear Product Cache'}
          </ButtonComponent>
        </div>
      </div>
      <div className="space-y-8">
        <div className="rounded-md border">
          <TableComponent>
            <TableHeaderComponent>
              <TableRowComponent>
                <TableHeadComponent className="w-[100px]">Image</TableHeadComponent>
                <TableHeadComponent>Status</TableHeadComponent>
                <TableHeadComponent>Product Title</TableHeadComponent>
                <TableHeadComponent>Type</TableHeadComponent>
                <TableHeadComponent>Pricing</TableHeadComponent>
                <TableHeadComponent>Billing Cycle</TableHeadComponent>
                <TableHeadComponent>Credits</TableHeadComponent>
                <TableHeadComponent>Rollover</TableHeadComponent>
                <TableHeadComponent className="text-right">Actions</TableHeadComponent>
              </TableRowComponent>
            </TableHeaderComponent>
            <TableBodyComponent>
              {products.map((product) => (
                <TableRowComponent key={product.id}>
                  <TableCellComponent>
                    {product.images && product.images[0] ? (
                      <ImageComponent
                        src={product.images[0]}
                        alt={product.name}
                        width={64}
                        height={64}
                        className="object-cover rounded-md"
                        unoptimized={product.images[0].includes('bypvhfmcxueaqlqixath.supabase.co/storage')}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 rounded-md flex items-center justify-center">
                        No image
                      </div>
                    )}
                  </TableCellComponent>
                  <TableCellComponent>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCellComponent>
                  <TableCellComponent className="font-medium">{product.name}</TableCellComponent>
                  <TableCellComponent>
                    <div className="space-y-1">
                      <div>{product.default_price?.recurring ? 'Subscription' : 'One-time'}</div>
                      {product.all_prices
                        .filter(price => price.id !== product.default_price?.id)
                        .map(price => (
                          <div key={price.id} className="text-sm text-muted-foreground">
                            {price.recurring ? 'Subscription' : 'One-time'}
                          </div>
                        ))}
                    </div>
                  </TableCellComponent>
                  <TableCellComponent>
                    <div className="space-y-1">
                      <div>${((product.default_price?.unit_amount ?? 0) / 100).toFixed(2)}</div>
                      {product.all_prices
                        .filter(price => price.id !== product.default_price?.id)
                        .map(price => (
                          <div key={price.id} className="text-sm text-muted-foreground">
                            ${((price.unit_amount ?? 0) / 100).toFixed(2)}
                          </div>
                        ))}
                    </div>
                  </TableCellComponent>
                  <TableCellComponent>
                    <div className="space-y-1">
                      <div>
                        {product.default_price?.recurring ? (
                          `${product.default_price.recurring.interval_count} ${product.default_price.recurring.interval}`
                        ) : (
                          '-'
                        )}
                      </div>
                      {product.all_prices
                        .filter(price => price.id !== product.default_price?.id)
                        .map(price => (
                          <div key={price.id} className="text-sm text-muted-foreground">
                            {price.recurring ? `${price.recurring.interval_count} ${price.recurring.interval}` : '-'}
                          </div>
                        ))}
                    </div>
                  </TableCellComponent>
                  <TableCellComponent>
                    {product.metadata?.credits ? Number(product.metadata.credits).toLocaleString() : '-'}
                  </TableCellComponent>
                  <TableCellComponent>
                    {product.metadata?.credits_rollover ? product.metadata.credits_rollover.toUpperCase() : '-'}
                  </TableCellComponent>
                  <TableCellComponent className="text-right">
                    <LinkComponent href={`/edit-product-stripe?product_id=${product.id}`}>
                      <ButtonComponent 
                        variant="outline" 
                        size="sm" 
                        className="whitespace-nowrap text-white border-0"
                        style={{ backgroundColor: themeColors?.dark || '#233D4D' }}
                      >
                        Edit Product
                      </ButtonComponent>
                    </LinkComponent>
                  </TableCellComponent>
                </TableRowComponent>
              ))}
            </TableBodyComponent>
          </TableComponent>
        </div>
        {devMode && isAdmin && (
          <CardComponent>
            <CardHeaderComponent>
              <CardTitleComponent>Raw API Response</CardTitleComponent>
            </CardHeaderComponent>
            <CardContentComponent>
              <pre className="bg-slate-100 p-4 rounded-lg overflow-auto max-h-[500px] text-sm">
                {JSON.stringify(products, null, 2)}
              </pre>
            </CardContentComponent>
          </CardComponent>
        )}
      </div>
    </div>
  )
} 