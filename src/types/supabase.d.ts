import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

declare module '@/utils/supabase/server' {
  export function createClient(): SupabaseClient;
}

// Extend the RealtimeChannel interface to properly support postgres_changes
declare module '@supabase/supabase-js' {
  interface RealtimeChannel {
    on(
      eventType: 'postgres_changes',
      filterObject: {
        event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
        schema: string;
        table: string;
        filter?: string;
      },
      callback: (payload: {
        new: Record<string, any>;
        old: Record<string, any>;
        eventType: 'INSERT' | 'UPDATE' | 'DELETE';
        [key: string]: any;
      }) => void
    ): RealtimeChannel;
  }
}

// Add custom types for our application
export interface TransactionPayload {
  id: string;
  name?: string;
  price?: string;
  status?: string;
  event_id?: string;
  interval?: string;
  last_payment?: string;
  transaction_id?: string;
  UID?: string;
  [key: string]: any;
} 