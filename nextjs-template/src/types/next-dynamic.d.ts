declare module 'next/dynamic' {
  import { ComponentType, ReactNode } from 'react';

  export interface DynamicOptions {
    loading?: ComponentType;
    ssr?: boolean;
    suspense?: boolean;
  }

  export default function dynamic<P = {}>(
    dynamicImport: () => Promise<{ default: ComponentType<P> }>,
    options?: DynamicOptions
  ): ComponentType<P>;
} 