'use client';

import React, { useState, useEffect } from 'react';
import Moralis from 'moralis';
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

interface WalletConnectButtonProps {
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export default function WalletConnectButton({ size = 'default', className = '' }: WalletConnectButtonProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [displayAddress, setDisplayAddress] = useState<string>("");

  // Initialize Moralis on component mount
  useEffect(() => {
    const initMoralis = async () => {
      try {
        // You would need to replace this with your actual Moralis API key
        if (!Moralis.Core.isStarted) {
          await Moralis.start({
            apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
          });
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing Moralis:', error);
      }
    };

    initMoralis();
  }, []);

  // Connect wallet using Moralis
  const connectWallet = async () => {
    if (!isInitialized) return;

    try {
      if (!window.ethereum) {
        alert('Please install MetaMask or another Web3 wallet');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        
        // Format address for display
        const formatted = `${accounts[0].substring(0, 6)}...${accounts[0].substring(accounts[0].length - 4)}`;
        setDisplayAddress(formatted);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const accountsChangedHandler = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setIsConnected(false);
          setAddress(null);
          setDisplayAddress("");
        } else {
          // Account changed
          setAddress(accounts[0]);
          const formatted = `${accounts[0].substring(0, 6)}...${accounts[0].substring(accounts[0].length - 4)}`;
          setDisplayAddress(formatted);
        }
      };
      
      window.ethereum.on('accountsChanged', accountsChangedHandler);
      
      return () => {
        // Clean up listeners
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', accountsChangedHandler);
        }
      };
    }
  }, []);

  // Different styles for desktop and mobile
  const desktopStyles = "bg-[var(--color-primary)] text-white hover:bg-white hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] border transition-colors w-40 rounded-[5px] text-sm flex items-center justify-center text-center";
  const mobileStyles = "bg-[var(--color-primary)] text-white hover:bg-white hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] border transition-colors rounded-[5px] text-xs flex items-center justify-center text-center px-2 py-1.5";
  
  // Size styles
  const sizeStyles = size === 'lg' ? 'h-11 text-md py-2.5' : '';
  
  // Apply different styles based on viewport
  const buttonStyles = `md:${desktopStyles} ${mobileStyles} ${sizeStyles} ${className}`;

  if (isConnected && address) {
    return (
      <button 
        onClick={connectWallet}
        className={buttonStyles}
      >
        <span className="flex items-center justify-center w-full">
          <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-green-300 mr-1 md:mr-2"></span>
          {displayAddress}
        </span>
      </button>
    );
  }

  return (
    <button 
      onClick={connectWallet}
      className={buttonStyles}
    >
      Connect
    </button>
  );
} 