'use client';

import React from 'react';
import { SwapCryptoButton as AppKitSwapCryptoButton } from './app-kit';
import { SwapCryptoButton as MoralisSwapCryptoButton } from './moralis';
import { useWalletProvider } from '@app/contexts/WalletProviderContext';

interface SmartSwapCryptoButtonProps {
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  children?: React.ReactNode;
}

export default function SmartSwapCryptoButton({
  className = '',
  size = 'default',
  variant = 'default',
  children = 'Swap Crypto',
}: SmartSwapCryptoButtonProps) {
  const { providerType } = useWalletProvider();

  // Render the appropriate component based on provider type
  if (providerType === 'moralis') {
    return (
      <MoralisSwapCryptoButton
        className={className}
        size={size}
        variant={variant}
      >
        {children}
      </MoralisSwapCryptoButton>
    );
  }

  // Default to AppKit
  return (
    <AppKitSwapCryptoButton
      className={className}
      size={size}
      variant={variant}
    >
      {children}
    </AppKitSwapCryptoButton>
  );
} 