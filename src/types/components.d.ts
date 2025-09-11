// Type declarations for UI components
declare module '@/components/ui/card' {
  export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
  export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
  export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/button' {
  import { ButtonHTMLAttributes } from 'react';
  
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
  }
  
  export const Button: React.FC<ButtonProps>;
}

declare module '@/components/ui/loading' {
  interface LoadingProps {
    text?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
  }
  
  const Loading: React.FC<LoadingProps>;
  export default Loading;
}

declare module '@/components/ClaimCreditsButton' {
  interface ClaimCreditsButtonProps {
    className?: string;
    trialCredits?: number;
  }
  
  const ClaimCreditsButton: React.FC<ClaimCreditsButtonProps>;
  export default ClaimCreditsButton;
}

declare module '@/utils/supabase/client' {
  import { SupabaseClient } from '@supabase/supabase-js';
  
  export function createClient(): SupabaseClient;
  export function updateClient(url: string, key: string): Promise<SupabaseClient>;
}

declare module '@/lib/utils' {
  import { ClassValue } from 'clsx';
  
  export function cn(...inputs: ClassValue[]): string;
} 