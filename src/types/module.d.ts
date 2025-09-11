declare module 'sonner' {
  export * from 'sonner'
  export const toast: {
    error: (message: string) => void;
    success: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
}

declare module 'date-fns' {
  export * from 'date-fns'
}

declare module 'next/navigation' {
  export * from 'next/navigation'
  
  // App Router hooks
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function useParams<T = Record<string, string | string[]>>(): T;
  
  // Navigation functions
  export function redirect(url: string): never;
  export function notFound(): never;
} 