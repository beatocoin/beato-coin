'use client';

import React from 'react';
import { Button } from '@submodule/components/ui/button';

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
  // Function to handle swapping crypto
  const handleSwapCrypto = async () => {
    try {
      // Check if Metamask is installed
      if (!window.ethereum) {
        alert('Please install MetaMask or another Web3 wallet');
        return;
      }
      
      // In a real implementation, you might integrate with 1inch, Uniswap, etc.
      // For now, we'll just redirect to 1inch as a fallback
      
      // Get the current chain ID to determine which network to use
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      let swapUrl = 'https://app.1inch.io/';
      
      // Redirect to the appropriate network on 1inch
      window.open(swapUrl, '_blank');
    } catch (error) {
      console.error('Error in swap crypto process:', error);
    }
  };

  return (
    <Button
      onClick={handleSwapCrypto}
      className={`bg-[var(--color-accent1)] hover:bg-[var(--color-accent1)] hover:opacity-90 text-white ${className}`}
      size={size}
      variant={variant}
    >
      {children}
    </Button>
  );
} 