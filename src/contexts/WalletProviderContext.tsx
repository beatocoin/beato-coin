'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define wallet provider types
export type WalletProviderType = 'appkit' | 'moralis';

// Define context type
interface WalletProviderContextType {
  providerType: WalletProviderType;
  setProviderType: (type: WalletProviderType) => void;
}

// Create context
const WalletProviderContext = createContext<WalletProviderContextType | undefined>(undefined);

// Provider component
interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProviderContextProvider = ({ children }: WalletProviderProps) => {
  // Default to AppKit
  const [providerType, setProviderType] = useState<WalletProviderType>('appkit');

  // Load saved preference from localStorage on component mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('walletProviderType') as WalletProviderType | null;
    if (savedProvider && (savedProvider === 'appkit' || savedProvider === 'moralis')) {
      setProviderType(savedProvider);
    }
  }, []);

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('walletProviderType', providerType);
  }, [providerType]);

  return (
    <WalletProviderContext.Provider value={{ providerType, setProviderType }}>
      {children}
    </WalletProviderContext.Provider>
  );
};

// Custom hook to use wallet provider context
export const useWalletProvider = () => {
  const context = useContext(WalletProviderContext);
  if (context === undefined) {
    throw new Error('useWalletProvider must be used within a WalletProviderContextProvider');
  }
  return context;
}; 