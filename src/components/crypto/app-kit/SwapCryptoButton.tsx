'use client';

import React from 'react';
import { Button } from '@submodule/components/ui/button';
import { useAppKit } from "@reown/appkit/react";

interface SwapCryptoButtonProps {
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  children?: React.ReactNode;
}

export default function SwapCryptoButton({
  className = '',
  size = 'default',
  variant = 'default',
  children = 'Swap Crypto',
}: SwapCryptoButtonProps) {
  const { open } = useAppKit();

  const handleOpenSwap = () => {
    // Open AppKit with the Swap view based on the documentation
    open({ view: 'Swap' });
  };

  return (
    <Button
      onClick={handleOpenSwap}
      className={`bg-[var(--color-accent1)] hover:bg-[var(--color-accent1)] hover:opacity-90 text-white ${className}`}
      size={size}
      variant={variant}
    >
      {children}
    </Button>
  );
} 