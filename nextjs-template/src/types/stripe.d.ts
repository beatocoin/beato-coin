import Stripe from 'stripe';

declare module 'stripe' {
  namespace Stripe {
    interface StripeConfig {
      apiVersion?: '2025-04-30.basil' | '2025-02-24.acacia' | '2023-10-16' | '2023-08-16' | '2022-11-15';
    }

    interface Subscription {
      current_period_end: number;
      current_period_start: number;
      cancel_at_period_end: boolean;
      status: string;
      id: string;
      items: {
        data: Array<{
          price: {
            unit_amount: number | null;
            recurring?: {
              interval: string;
            } | null;
          };
          product: Product;
        }>;
      };
    }

    interface Invoice {
      subscription?: string;
      amount_paid: number;
      created: number;
    }

    interface Product {
      id: string;
      name: string;
      description: string | null;
      metadata: Record<string, string>;
      default_price?: string | Price | null;
      images?: string[];
      prices?: Price[];
    }

    interface Price {
      id: string;
      unit_amount: number | null;
      recurring?: {
        interval: string;
        interval_count: number;
        trial_period_days?: number;
      } | null;
      product: string | Product;
    }
  }
} 