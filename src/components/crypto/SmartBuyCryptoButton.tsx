'use client';

import React from 'react';
import { BuyCryptoButton as AppKitBuyCryptoButton } from './app-kit';
import { BuyCryptoButton as MoralisBuyCryptoButton } from './moralis';
import { useWalletProvider } from '@app/contexts/WalletProviderContext';

interface SmartBuyCryptoButtonProps {
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  children?: React.ReactNode;
}

export default function SmartBuyCryptoButton({
  className = '',
  size = 'default',
  variant = 'default',
  children = 'Buy Crypto',
}: SmartBuyCryptoButtonProps) {
  const { providerType } = useWalletProvider();

  // Render the appropriate component based on provider type
  if (providerType === 'moralis') {
    return (
      <MoralisBuyCryptoButton
        className={className}
        size={size}
        variant={variant}
      >
        {children}
      </MoralisBuyCryptoButton>
    );
  }

  // Default to AppKit
  return (
    <AppKitBuyCryptoButton
      className={className}
      size={size}
      variant={variant}
    >
      {children}
    </AppKitBuyCryptoButton>
  );
} 