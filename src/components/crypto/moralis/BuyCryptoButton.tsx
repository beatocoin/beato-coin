'use client';

import React from 'react';
import { Button } from '@submodule/components/ui/button';
import Moralis from 'moralis';

// Define window.ethereum type directly instead of importing
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, listener: (...args: any[]) => void) => void;
      removeListener: (event: string, listener: (...args: any[]) => void) => void;
      selectedAddress?: string;
      isConnected?: () => boolean;
      chainId?: string;
    };
  }
}

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
  // Function to handle buying crypto
  const handleBuyCrypto = async () => {
    try {
      // Check if Metamask is installed
      if (!window.ethereum) {
        alert('Please install MetaMask or another Web3 wallet');
        return;
      }
      
      // Here you would typically redirect to an on-ramp provider
      // For now, we'll just open a modal with options
      // In a real implementation, you might integrate with Transak, Moonpay, etc.
      
      // Simple demonstration - this would be replaced with actual on-ramp integration
      const onRampProviders = [
        { name: 'Transak', url: 'https://global.transak.com/' },
        { name: 'MoonPay', url: 'https://www.moonpay.com/' },
        { name: 'Ramp', url: 'https://ramp.network/' },
      ];

      // Display options to user (in a real app, use a proper modal)
      const provider = window.confirm(
        'Choose an on-ramp provider:\n' +
        onRampProviders.map((p, i) => `${i + 1}. ${p.name}`).join('\n') +
        '\n\nClick OK to go to Transak (demo).'
      );

      if (provider) {
        window.open('https://global.transak.com/', '_blank');
      }
    } catch (error) {
      console.error('Error in buy crypto process:', error);
    }
  };

  return (
    <Button
      onClick={handleBuyCrypto}
      className={`bg-[var(--color-accent1)] hover:bg-[var(--color-accent1)] hover:opacity-90 text-white ${className}`}
      size={size}
      variant={variant}
    >
      {children}
    </Button>
  );
} 