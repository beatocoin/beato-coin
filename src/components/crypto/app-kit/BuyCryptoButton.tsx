'use client';

import React from 'react';
import { Button } from '@submodule/components/ui/button';
import { useAppKit } from "@reown/appkit/react";

interface BuyCryptoButtonProps {
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  children?: React.ReactNode;
}

export default function BuyCryptoButton({
  className = '',
  size = 'default',
  variant = 'default',
  children = 'Buy Crypto',
}: BuyCryptoButtonProps) {
  const { open } = useAppKit();

  const handleOpenOnRamp = () => {
    open({ view: 'OnRampProviders' });
  };

  return (
    <Button
      onClick={handleOpenOnRamp}
      className={`bg-[var(--color-accent1)] hover:bg-[var(--color-accent1)] hover:opacity-90 text-white ${className}`}
      size={size}
      variant={variant}
    >
      {children}
    </Button>
  );
} 