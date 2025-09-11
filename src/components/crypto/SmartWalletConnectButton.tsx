'use client';

import React from 'react';
import { WalletConnectButton as AppKitWalletConnectButton } from './app-kit';
import { WalletConnectButton as MoralisWalletConnectButton } from './moralis';
import { useWalletProvider } from '@app/contexts/WalletProviderContext';

interface SmartWalletConnectButtonProps {
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  label?: string;
}

export default function SmartWalletConnectButton({ size = 'default', className = '', label }: SmartWalletConnectButtonProps) {
  const { providerType } = useWalletProvider();

  // Render the appropriate component based on provider type
  if (providerType === 'moralis') {
    return <MoralisWalletConnectButton size={size} className={className} />;
  }

  // Default to AppKit
  return <AppKitWalletConnectButton size={size} className={className} />;
} 