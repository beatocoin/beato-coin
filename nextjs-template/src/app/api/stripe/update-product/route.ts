import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

interface MarketingFeature {
  feature: string
}

interface PriceData {
  id?: string
  amount: number
  payment_type: 'one_time' | 'recurring'
  billing_period?: 'monthly' | 'yearly'
  is_default: boolean
  active?: boolean
  has_trial?: boolean
  trial_period_days?: number
  trial_requires_payment_method?: boolean
  trial_end_behavior?: 'cancel' | 'pause'
}

interface ProductData {
  id: string
  name: string
  description?: string
  image?: string
  product_tax_code?: string
  statement_descriptor?: string
  credits?: number
  credits_rollover?: boolean
  marketing_features: MarketingFeature[]
  prices: PriceData[]
  include_tax: 'yes' | 'no' | 'auto'
  active?: boolean
  pricesToReactivate?: string[] // IDs of prices to reactivate
}

export async function POST(req: Request) {
  try {
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

    const productData: ProductData = await req.json()

    if (!productData.id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Update the product
    const product = await stripe.products.update(productData.id, {
      name: productData.name,
      description: productData.description,
      images: productData.image ? [productData.image] : undefined,
      active: productData.active,
      tax_code: productData.product_tax_code,
      statement_descriptor: productData.statement_descriptor,
      metadata: {
        ...(typeof productData.credits === 'number' ? { credits: productData.credits.toString() } : {}),
        ...(typeof productData.credits_rollover === 'boolean' ? { credits_rollover: productData.credits_rollover.toString() } : {}),
        ...productData.marketing_features.reduce((acc: Record<string, string>, feature: MarketingFeature, index: number) => ({
          ...acc,
          [`marketing_feature_${index + 1}`]: feature.feature
        }), {})
      }
    })

    // Handle prices: create new ones, update existing ones
    // First, get all existing prices for the product
    const existingPrices = await stripe.prices.list({
      product: productData.id,
      limit: 100,
    });

    // Track which existing prices are still in use
    const existingPriceIds = new Set(existingPrices.data.map(price => price.id));
    
    // Get IDs of prices that are in the form data
    const formPriceIds = new Set(
      productData.prices
        .filter(p => p.id) // Only include prices that have IDs
        .map(p => p.id)
    );
    
    // Check if we need to preserve existing prices
    const shouldPreserveExistingPrices = productData.prices.length > 0 && 
      productData.prices.some(p => p.id) && 
      formPriceIds.size === 0;
    
    if (shouldPreserveExistingPrices) {
      // Don't archive any prices in this case
      return NextResponse.json(
        { error: 'Price IDs are missing in the form data. Please try again.' },
        { status: 400 }
      );
    }
    
    // Find prices to archive (existing active prices not in the form data)
    const pricesToArchive = existingPrices.data.filter(price => 
      price.active && !formPriceIds.has(price.id)
    );
    
    // Archive prices that were removed
    if (pricesToArchive.length > 0) {
      await Promise.all(pricesToArchive.map(price => 
        stripe.prices.update(price.id, { active: false })
      ));
    }

    // Reactivate prices if specified
    if (productData.pricesToReactivate && productData.pricesToReactivate.length > 0) {
      
      await Promise.all(productData.pricesToReactivate.map(priceId => 
        stripe.prices.update(priceId, { active: true })
      ));
      
      // Add reactivated prices to the form price IDs so they don't get archived again
      productData.pricesToReactivate.forEach(priceId => formPriceIds.add(priceId));
    }

    // Process the prices from the form
    const pricePromises = productData.prices.map(async (priceData: PriceData) => {
      // Convert price to cents (multiply by 100 and ensure whole number)
      const unitAmount = Math.round(priceData.amount * 100);
      
      // If it's an existing price, check if the amount has changed
      if (priceData.id && existingPriceIds.has(priceData.id)) {
        // Find the existing price
        const existingPrice = existingPrices.data.find(p => p.id === priceData.id);
        
        if (existingPrice) {
          // Check if the price should be deactivated
          if (priceData.active === false) {
            await stripe.prices.update(priceData.id, { active: false });
            return stripe.prices.retrieve(priceData.id);
          }
          
          // Check if the amount or other key attributes have changed
          const priceHasChanged = 
            existingPrice.unit_amount !== unitAmount ||
            (existingPrice.recurring && priceData.payment_type !== 'recurring') ||
            (!existingPrice.recurring && priceData.payment_type === 'recurring') ||
            (existingPrice.recurring && priceData.payment_type === 'recurring' && 
             ((existingPrice.recurring.interval === 'month' && priceData.billing_period === 'yearly') ||
              (existingPrice.recurring.interval === 'year' && priceData.billing_period === 'monthly'))) ||
            // Check if trial parameters have changed
            (existingPrice.recurring && 
             ((priceData.has_trial && !existingPrice.recurring.trial_period_days) ||
              (!priceData.has_trial && existingPrice.recurring.trial_period_days) ||
              (priceData.has_trial && priceData.trial_period_days && 
               existingPrice.recurring.trial_period_days !== priceData.trial_period_days)));
          
          if (priceHasChanged) {
            
            // Create a new price with the updated values
            const newPrice = await stripe.prices.create({
              unit_amount: unitAmount,
              currency: 'usd',
              product: product.id,
              tax_behavior: productData.include_tax === 'yes' ? 'inclusive' as const : 
                           productData.include_tax === 'no' ? 'exclusive' as const : 
                           'unspecified' as const,
              ...(priceData.payment_type === 'recurring' ? {
                recurring: {
                  interval: priceData.billing_period === 'yearly' ? 'year' : 'month',
                  ...(priceData.has_trial && priceData.trial_period_days ? {
                    trial_period_days: priceData.trial_period_days
                  } : {})
                }
              } : {})
            });
            
            // Check if this is the default price
            const isDefaultPrice = product.default_price === existingPrice.id;
            
            if (isDefaultPrice) {
              // Set the new price as default before archiving the old one
              await stripe.products.update(product.id, {
                default_price: newPrice.id
              });
            }
            
            // Now it's safe to archive the old price
            await stripe.prices.update(priceData.id, { active: false });
            
            return newPrice;
          } else {
            return stripe.prices.retrieve(priceData.id);
          }
        }
      }
      
      // Create a new price
      
      return stripe.prices.create({
        unit_amount: unitAmount,
        currency: 'usd',
        product: product.id,
        tax_behavior: productData.include_tax === 'yes' ? 'inclusive' as const : 
                     productData.include_tax === 'no' ? 'exclusive' as const : 
                     'unspecified' as const,
        ...(priceData.payment_type === 'recurring' ? {
          recurring: {
            interval: priceData.billing_period === 'yearly' ? 'year' : 'month',
            ...(priceData.has_trial && priceData.trial_period_days ? {
              trial_period_days: priceData.trial_period_days
            } : {})
          }
        } : {})
      });
    });

    const prices = await Promise.all(pricePromises);

    // Set the default price if it's not already set during the price update process
    const defaultPriceIndex = productData.prices.findIndex(price => price.is_default);
    const defaultPrice = defaultPriceIndex >= 0 ? prices[defaultPriceIndex] : null;

    if (defaultPrice) {
      // Check if this price is already set as default (might have been set above)
      const currentProduct = await stripe.products.retrieve(product.id);
      if (currentProduct.default_price !== defaultPrice.id) {
        await stripe.products.update(product.id, {
          default_price: defaultPrice.id
        });
      }
    }

    return NextResponse.json({ 
      product: {
        ...product,
        default_price: defaultPrice
      }, 
      prices 
    })
  } catch (error) {
    console.error('Error updating product:', error)
    // Add more detailed error logging
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe API Error:', {
        type: error.type,
        code: error.code,
        param: error.param,
        message: error.message
      })
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
} 