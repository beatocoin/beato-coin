'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SmartWalletConnectButton from '@app/components/crypto/SmartWalletConnectButton';
import { Card, CardContent, CardHeader, CardTitle } from '@submodule/components/ui/card';
import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { useWalletProvider } from '@app/contexts/WalletProviderContext';
import { Copy, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import SmartBuyCryptoButton from '@app/components/crypto/SmartBuyCryptoButton';
import SmartSwapCryptoButton from '@app/components/crypto/SmartSwapCryptoButton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectLabel } from '@submodule/components/ui/select';
import React from 'react';
import { createClient } from '@submodule/utils/supabase/client';
import { modal, emailOnlyModal } from '@app/context/index';
import EVMWalletCreateButton from '../../components/crypto/EVMWalletCreateButton';
import useBeatoWalletStore from '../../stores/beatoWalletStore';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@submodule/components/ui/table';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Modal, ModalTrigger, ModalContent, ModalHeader, ModalTitle, ModalClose } from "@submodule/components/ui/modal";

// Define window.ethereum type
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

// Move chainMap outside the component
const chainMap: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  solana: 0, // Solana doesn't use a chain ID in the same way as EVM
  bitcoin: 0, // Bitcoin doesn't use a chain ID in the same way as EVM
};

const ALCHEMY_BASE_URL = 'https://eth-mainnet.g.alchemy.com/v2/';
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/token_price/ethereum';

function isEvmAddress(address: string) {
  return address && address.startsWith('0x') && address.length === 42;
}

export default function WalletPage() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const { providerType } = useWalletProvider();
  const [blockchain, setBlockchain] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedBlockchain') || 'ethereum';
    }
    return 'ethereum';
  });
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateWalletModal, setShowCreateWalletModal] = useState(false);
  
  // AppKit connection check
  const appKitAccount = useAppKitAccount();
  const { open } = useAppKit();
  
  const hasInsertedWallet = useRef(false);
  
  const beatoWallet = useBeatoWalletStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'tokens' | 'transactions' | 'redemptions'>('tokens');
  
  // Add state for transactions and loading
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  
  // Add state for tokens and loading
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  
  // Add state for Beato Coin balance and value
  const [beatoBalance, setBeatoBalance] = useState(0);
  const [beatoValue, setBeatoValue] = useState(0);
  
  // Add state for coin transactions
  const [coinTransactions, setCoinTransactions] = useState<any[]>([]);
  const [isLoadingCoinTx, setIsLoadingCoinTx] = useState(false);
  const [coinTxError, setCoinTxError] = useState<string | null>(null);
  
  // Add state for redemptions and loading
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [isLoadingRedemptions, setIsLoadingRedemptions] = useState(false);
  const [redemptionsError, setRedemptionsError] = useState<string | null>(null);
  
  // Check connection status based on current provider
  useEffect(() => {
    // Check if AppKit is connected
    if (providerType === 'appkit') {
      setIsWalletConnected(prev => {
        if (prev !== appKitAccount.isConnected) return appKitAccount.isConnected;
        return prev;
      });
      if (appKitAccount.address) {
        setWalletAddress(prev => {
          if (appKitAccount.address && prev !== appKitAccount.address) return appKitAccount.address;
          return prev;
        });
      }
    } else {
      // For Moralis, check ethereum connection
      if (typeof window !== 'undefined' && window.ethereum) {
        // If ethereum object exists and has an address, consider it connected
        const connected = !!window.ethereum.selectedAddress;
        setIsWalletConnected(prev => {
          if (prev !== connected) return connected;
          return prev;
        });
        if (connected && window.ethereum?.selectedAddress) {
          setWalletAddress(prev => {
            if (window.ethereum?.selectedAddress && prev !== window.ethereum.selectedAddress) return window.ethereum.selectedAddress;
            return prev;
          });
        }
        
        // Listen for account changes
        const handleAccountsChanged = (accounts: string[]) => {
          const connected = accounts.length > 0;
          setIsWalletConnected(connected);
          
          if (connected && accounts[0]) {
            setWalletAddress(accounts[0]);
          } else {
            setWalletAddress("");
          }
        };
        
        // Using optional chaining to avoid "possibly undefined" error
        window.ethereum?.on('accountsChanged', handleAccountsChanged);
        
        // Cleanup listener on unmount
        return () => {
          window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        };
      } else {
        setIsWalletConnected(false);
        setWalletAddress("");
      }
    }
  }, [providerType, appKitAccount.isConnected, appKitAccount.address]);

  useEffect(() => {
    // Fetch dev_mode from Supabase
    const fetchDevMode = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('crypto_settings').select('dev_mode').single();
      setDevMode(!!data?.dev_mode);
    };
    fetchDevMode();
  }, []);

  useEffect(() => {
    const fetchNetWorth = async () => {
      // Use SDK values directly
      const connected = providerType === 'appkit' ? appKitAccount.isConnected : isWalletConnected;
      const address = providerType === 'appkit' ? appKitAccount.address : walletAddress;

      if (!connected || !address) {
        setApiResponse(null);
        return;
      }
      setIsLoadingApi(true);
      try {
        const supabase = createClient();
        // Check for existing wallet row
        const { data: walletRow } = await supabase
          .from('user_wallets')
          .select('balance_usd')
          .eq('public_key', address)
          .maybeSingle();
        if (walletRow && walletRow.balance_usd !== null && walletRow.balance_usd !== undefined) {
          setApiResponse({ total_networth_usd: walletRow.balance_usd });
          setIsLoadingApi(false);
          return;
        }
        // If not found or missing balance, call Moralis
        const isNonEvm = blockchain === 'solana' || blockchain === 'bitcoin';
        const chain = chainMap[blockchain];
        let url = `/api/wallet-net-worth?address=${address}`;
        if (isNonEvm) {
          url += `&chainName=${blockchain}`;
        } else {
          url += `&chain=${chain}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setApiResponse(data);
        // If we have a valid total_networth_usd, update or insert into the database
        if (data.total_networth_usd !== undefined) {
          const { data: existing } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('public_key', address)
            .maybeSingle();
          if (existing) {
            const { error } = await supabase
              .from('user_wallets')
              .update({ balance_usd: data.total_networth_usd })
              .eq('public_key', address);
            if (error) {
              console.error('Failed to update wallet balance in database:', error);
            }
          }
        }
      } catch (err) {
        setApiResponse({ error: String(err) });
      } finally {
        setIsLoadingApi(false);
      }
    };
    fetchNetWorth();
  }, [providerType, appKitAccount.isConnected, appKitAccount.address, isWalletConnected, walletAddress, blockchain]);

  useEffect(() => {
    // Only run for AppKit wallets, when connected, and after Moralis API response is loaded
    if (
      providerType === 'appkit' &&
      isWalletConnected &&
      walletAddress &&
      apiResponse?.total_networth_usd !== undefined &&
      !hasInsertedWallet.current
    ) {
      const insertWallet = async () => {
        const supabase = createClient();
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Check if wallet already exists
        const { data: existing } = await supabase
          .from('user_wallets')
          .select('id')
          .eq('public_key', walletAddress)
          .maybeSingle();
        if (existing) {
          hasInsertedWallet.current = true;
          return;
        }
        // Insert new wallet row
        const { error: insertError } = await supabase
          .from('user_wallets')
          .insert([{
            UID: user.id,
            user_role: 'subscriber',
            public_key: walletAddress,
            balance_usd: apiResponse.total_networth_usd,
          }]);
        if (!insertError) {
          hasInsertedWallet.current = true;
        } else {
          console.error('Failed to insert wallet:', insertError);
        }
      };
      insertWallet();
    }
  }, [providerType, isWalletConnected, walletAddress, apiResponse?.total_networth_usd]);

  // Log AppKit account only when connection status or address changes
  useEffect(() => {
    if (providerType === 'appkit' && appKitAccount.isConnected && appKitAccount.address) {
      // Removed: console.log('AppKit connected wallet:', appKitAccount);
    }
  }, [providerType, appKitAccount.isConnected, appKitAccount.address]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Wallet Address Copied');
  };

  // Helper to format USD
  const formatUSD = (amount: number | string | undefined) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!num || isNaN(num)) return '$0.00';
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  };

  // Handler to refresh balance from Moralis
  const handleRefresh = async () => {
    if (!isWalletConnected || !walletAddress) return;
    setIsRefreshing(true);
    try {
      // For EVM chains use chain ID, for non-EVM pass the chain name
      const isNonEvm = blockchain === 'solana' || blockchain === 'bitcoin';
      const chain = chainMap[blockchain];
      let url = `/api/wallet-net-worth?address=${walletAddress}`;
      
      if (isNonEvm) {
        url += `&chainName=${blockchain}`;
      } else {
        url += `&chain=${chain}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      setApiResponse(data);
      
      // Update the balance in Supabase if we have a valid total_networth_usd
      if (data.total_networth_usd !== undefined) {
        const supabase = createClient();
        // Try to update the wallet balance in Supabase
        const { error } = await supabase
          .from('user_wallets')
          .update({ balance_usd: data.total_networth_usd })
          .eq('public_key', walletAddress);
          
        if (error) {
          console.error('Failed to update wallet balance in database:', error);
        }
      }
    } catch (err) {
      toast.error('Failed to refresh balance');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add these variables at the top of the WalletPage component render logic
  const connected = beatoWallet.isConnected
    ? true
    : providerType === 'appkit'
      ? appKitAccount.isConnected
      : isWalletConnected;

  const address = beatoWallet.isConnected
    ? beatoWallet.address
    : providerType === 'appkit'
      ? appKitAccount.address
      : walletAddress;

  // Fetch transactions when Transactions tab is active and wallet is connected
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!connected || !address || activeTab !== 'transactions') return;
      setIsLoadingTransactions(true);
      setTransactionsError(null);
      setTransactions([]);
      try {
        if (blockchain === 'solana' || blockchain === 'bitcoin') {
          // Placeholder for non-EVM chains
          setTransactions([]);
          setTransactionsError('Transaction history for this blockchain is not yet supported.');
          setIsLoadingTransactions(false);
          return;
        }
        // EVM chains: fetch from Moralis
        const chain = chainMap[blockchain];
        const url = `/api/wallet-transactions?address=${address}&chain=${chain}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch transactions');
        const data = await res.json();
        // Log the transactions API response to the browser console
        console.log('[Transactions API Response]:', data);
        setTransactions(data.result || []);
      } catch (err: any) {
        setTransactionsError(err.message || 'Failed to load transactions');
      } finally {
        setIsLoadingTransactions(false);
      }
    };
    fetchTransactions();
    // Only refetch when these change
  }, [connected, address, blockchain, activeTab]);

  // Fetch EVM tokens when My Tokens tab is active and wallet is connected
  useEffect(() => {
    const fetchEvmTokens = async (address: string) => {
      setIsLoadingTokens(true);
      setTokensError(null);
      setTokens([]);
      try {
        // 1. Fetch token balances from Alchemy
        const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
        if (!alchemyApiKey) throw new Error('Alchemy API key not set');
        const url = `${ALCHEMY_BASE_URL}${alchemyApiKey}`;
        const body = {
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getTokenBalances',
          params: [address],
        };
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        const tokenBalances = data.result.tokenBalances || [];

        // 2. Fetch token metadata for each token
        const metadataPromises = tokenBalances.map(async (tb: any) => {
          const metaBody = {
            id: 1,
            jsonrpc: '2.0',
            method: 'alchemy_getTokenMetadata',
            params: [tb.contractAddress],
          };
          const metaRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metaBody),
          });
          const metaData = await metaRes.json();
          return metaData.result;
        });
        const metadatas = await Promise.all(metadataPromises);

        // 3. Fetch token prices from CoinGecko (optional, fallback to 0)
        const priceQuery = metadatas
          .filter((m: any) => m && m.address)
          .map((m: any) => m.address.toLowerCase())
          .join(',');
        let prices: Record<string, any> = {};
        if (priceQuery) {
          const priceRes = await fetch(
            `${COINGECKO_API}?contract_addresses=${priceQuery}&vs_currencies=usd`
          );
          prices = await priceRes.json();
        }

        // 4. Combine balances, metadata, and prices
        let tokensList = tokenBalances.map((tb: any, i: number) => {
          const meta = metadatas[i];
          const balanceRaw = tb.tokenBalance || '0x0';
          const decimals = meta?.decimals || 18;
          const balance = parseInt(balanceRaw, 16) / Math.pow(10, decimals);
          const price = prices[meta?.address?.toLowerCase()]?.usd || 0;
          return {
            address: meta?.address,
            name: meta?.name,
            symbol: meta?.symbol,
            logo: meta?.logo || '',
            balance,
            price,
            value: balance * price,
          };
        });
        // Filter out tokens with 0 balance
        tokensList = tokensList.filter((token: any) => token.balance > 0);
        setTokens(tokensList);
        // Save the tokens list to the token_balance column in user_wallets
        try {
          const supabase = createClient();
          const { data: walletRow } = await supabase
            .from('user_wallets')
            .select('id')
            .eq('public_key', address)
            .maybeSingle();
          if (walletRow && walletRow.id) {
            const { error: updateError } = await supabase
              .from('user_wallets')
              .update({ token_balance: tokensList })
              .eq('public_key', address);
            if (updateError) {
              console.error('[Supabase] Failed to update token_balance:', updateError);
            } else {
              console.log('[Supabase] token_balance updated for', address);
            }
          } else {
            console.log('[Supabase] No wallet row found for', address, '- skipping token_balance cache');
          }
        } catch (e) {
          console.error('[Supabase] Error updating token_balance:', e);
        }
      } catch (err: any) {
        setTokensError(err.message || 'Failed to load tokens');
      } finally {
        setIsLoadingTokens(false);
      }
    };
    if (
      activeTab === 'tokens' &&
      connected &&
      address &&
      isEvmAddress(address)
    ) {
      fetchEvmTokens(address);
    }
  }, [activeTab, connected, address]);

  useEffect(() => {
    const fetchBeatoWallet = async () => {
      const supabase = createClient();
      if (!address) return;
      const { data, error } = await supabase
        .from('user_wallets')
        .select('beato_coins')
        .eq('public_key', address)
        .maybeSingle();
      if (error) {
        setBeatoBalance(0);
        setBeatoValue(0);
        return;
      }
      const coins = typeof data?.beato_coins === 'number' ? data.beato_coins : 0;
      setBeatoBalance(coins);
      setBeatoValue(coins * 27.6);
    };
    fetchBeatoWallet();
  }, [connected, address]);

  useEffect(() => {
    const fetchCoinTransactions = async () => {
      setIsLoadingCoinTx(true);
      setCoinTxError(null);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('coin_transactions')
          .select('id, tokens_total, fiat_total, created_at')
          .eq('UID', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setCoinTransactions(data || []);
      } catch (err: any) {
        setCoinTxError(err.message || 'Failed to load Beato Coin transactions');
      } finally {
        setIsLoadingCoinTx(false);
      }
    };
    fetchCoinTransactions();
  }, [connected]);

  useEffect(() => {
    const fetchRedemptions = async () => {
      if (activeTab !== 'redemptions') return;
      setIsLoadingRedemptions(true);
      setRedemptionsError(null);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('redemption_requests')
          .select('tokens_redeemed, shipping_address, created_at, status')
          .eq('UID', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setRedemptions(data || []);
      } catch (err: any) {
        setRedemptionsError(err.message || 'Failed to load redemption requests');
      } finally {
        setIsLoadingRedemptions(false);
      }
    };
    fetchRedemptions();
  }, [activeTab, connected]);

  // Clear wallet state on logout
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setIsWalletConnected(false);
        setWalletAddress("");
        setApiResponse(null);
        setTokens([]);
        setTransactions([]);
        setBeatoBalance(0);
        setBeatoValue(0);
        setCoinTransactions([]);
        setRedemptions([]);
        beatoWallet.disconnect();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <Toaster position="top-right" />
        <div className="flex justify-end items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Blockchain</span>
            <Select value={blockchain} onValueChange={async value => {
              setBlockchain(value);
              if (typeof window !== 'undefined') {
                localStorage.setItem('selectedBlockchain', value);
              }
              // Always fetch from Moralis on dropdown change
              if (connected && address) {
                setIsLoadingApi(true);
                try {
                  // For EVM chains use chain ID, for non-EVM pass the chain name
                  const isNonEvm = value === 'solana' || value === 'bitcoin';
                  const chain = chainMap[value];
                  let url = `/api/wallet-net-worth?address=${address}`;
                  
                  if (isNonEvm) {
                    url += `&chainName=${value}`;
                  } else {
                    url += `&chain=${chain}`;
                  }
                  
                  const res = await fetch(url);
                  const data = await res.json();
                  setApiResponse(data);
                  
                  // Update the balance in Supabase if we have a valid total_networth_usd
                  if (data.total_networth_usd !== undefined) {
                    const supabase = createClient();
                    // Try to update the wallet balance in Supabase
                    const { error } = await supabase
                      .from('user_wallets')
                      .update({ balance_usd: data.total_networth_usd })
                      .eq('public_key', address);
                      
                    if (error) {
                      console.error('Failed to update wallet balance in database:', error);
                    }
                  }
                } catch (err) {
                  setApiResponse({ error: String(err) });
                } finally {
                  setIsLoadingApi(false);
                }
              }
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ethereum">Ethereum</SelectItem>
                <SelectItem value="base">Base</SelectItem>
                <SelectItem value="solana">Solana</SelectItem>
                <SelectItem value="bitcoin">Bitcoin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Refresh Button */}
        <div className="flex justify-end mb-6">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!connected || isRefreshing}
            className="px-4 py-2 rounded font-medium bg-[var(--color-accent2)] text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 className="animate-spin h-5 w-5 inline-block mr-2" /> : null}
            Refresh
          </button>
        </div>
        <h1 className="text-4xl font-bold mb-8 text-center">Wallet</h1>
        
        <div className="grid grid-cols-1 gap-8">
          {/* Wallet Card */}
          <Card className="h-full bg-white py-[50px] px-[25px]">
            {!connected ? (
              <>
                <CardHeader className="md:px-[50px] text-center">
                  <CardTitle className="text-center">Create or Connect Your Wallet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 md:px-[50px] text-center">
                  <div className="text-gray-600 mb-6">
                    <p>You can create a new wallet or connect an existing one to access cryptocurrency features and manage your assets.</p>
                  </div>
                  {/* AppKit Create Wallet Button */}
                  <div className="flex flex-col gap-4 sm:flex-row justify-center mb-4 w-full max-w-md mx-auto">
                    <EVMWalletCreateButton showConnectBeatoButton={!beatoWallet.isConnected && !appKitAccount.isConnected} className="w-full" />
                    <button
                      type="button"
                      onClick={() => modal.open({ view: 'Connect' })}
                      className="w-full h-11 whitespace-nowrap overflow-hidden text-ellipsis font-medium text-md flex items-center justify-center text-center border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
                    >
                      Connect Other Wallet
                    </button>
                  </div>
                </CardContent>
              </>
            ) : (
              <>
                <CardContent className="space-y-6 md:px-[50px] py-8">
                  {/* Wallet Address Section */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center justify-between border border-[#d8d8d8] bg-white p-3 rounded-lg w-full max-w-xl">
                      <span className="text-gray-700 font-medium truncate mx-auto pr-6">
                        {address}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(address || "")}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Wallet Balance Section */}
                  <div className="text-center mt-12">
                    <div className="text-6xl font-bold mb-2 flex items-center justify-center min-h-[56px]">
                      {isLoadingApi ? (
                        <Loader2 className="animate-spin h-10 w-10 text-gray-400" />
                      ) : (
                        formatUSD((apiResponse?.total_networth_usd || 0) + beatoValue)
                      )}
                    </div>
                    <div className="text-gray-500">Total Wallet Value</div>
                  </div>
                  
                  {/* Wallet Connection Button */}
                  {!beatoWallet.isConnected && (
                    <div className="flex justify-center mt-8">
                      <SmartWalletConnectButton size="lg" className="px-[50px] w-auto min-w-[172px]" />
                    </div>
                  )}
                  
                  {/* Crypto Actions Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 mt-8 md:mt-[100px]">
                    <div className="flex-1 flex justify-center">
                      <a
                        href="https://www.aquabeato.shop/pre-buy/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full max-w-[200px] h-12 py-3 px-6 rounded bg-[var(--color-accent1)] text-white font-semibold text-center hover:bg-white hover:text-[var(--color-accent1)] hover:border-[var(--color-accent1)] border transition-colors flex items-center justify-center"
                      >
                        Buy Beato Coin
                      </a>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <Modal>
                        <ModalTrigger asChild>
                          <button className="w-full max-w-[200px] h-12 py-3 px-6 rounded bg-[var(--color-accent2)] text-white font-semibold text-center hover:bg-white hover:text-[var(--color-accent2)] hover:border-[var(--color-accent2)] border transition-colors flex items-center justify-center text-xs">
                            About Beato Crypto
                          </button>
                        </ModalTrigger>
                        <ModalContent
                          style={{
                            width: '750px',
                            maxWidth: '95vw',
                            padding: '0',
                            borderRadius: '16px',
                            background: '#fff',
                          }}
                        >
                          <div
                            style={{
                              padding: '25px',
                              maxWidth: '95vw',
                            }}
                            className="sm:p-[25px] p-[10px] flex flex-col items-center justify-center"
                          >
                            <ModalHeader>
                              <ModalTitle>About Beato Crypto</ModalTitle>
                            </ModalHeader>
                            <video
                              src="/aqua-beato-coin-overview.mp4"
                              controls
                              style={{
                                width: '100%',
                                maxWidth: '650px',
                                height: '400px',
                                borderRadius: '12px',
                                background: '#000',
                                margin: '0 auto',
                                display: 'block',
                              }}
                            />
                          </div>
                          <ModalClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <span className="sr-only">Close</span>
                          </ModalClose>
                        </ModalContent>
                      </Modal>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <SmartSwapCryptoButton 
                        size="lg" 
                        className="w-full max-w-[200px] bg-[var(--color-accent1)] text-white hover:bg-white hover:text-[var(--color-accent1)] hover:border-[var(--color-accent1)] border transition-colors"
                      >
                        Swap Crypto
                      </SmartSwapCryptoButton>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>

        {/* Tabs: Only show if wallet is connected */}
        {connected && (
          <div className="mt-8">
            <div className="flex flex-col md:flex-row border-b border-gray-200 mb-4">
              <button
                className={`px-6 py-3 font-semibold text-md focus:outline-none transition border-b-2 ${activeTab === 'tokens' ? 'border-[#d8d8d8] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-[var(--color-primary)]'}`}
                onClick={() => setActiveTab('tokens')}
              >
                My Tokens
              </button>
              <button
                className={`px-6 py-3 font-semibold text-md focus:outline-none transition border-b-2 ${activeTab === 'transactions' ? 'border-[#d8d8d8] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-[var(--color-primary)]'}`}
                onClick={() => setActiveTab('transactions')}
              >
                Transactions
              </button>
              <button
                className={`px-6 py-3 font-semibold text-md focus:outline-none transition border-b-2 ${activeTab === 'redemptions' ? 'border-[#d8d8d8] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-[var(--color-primary)]'}`}
                onClick={() => setActiveTab('redemptions')}
              >
                Redemption Requests
              </button>
            </div>
            <div>
              {activeTab === 'tokens' && (
                <div className="p-6 bg-white rounded shadow min-h-[200px]">
                  {/* Always show Beato Coin block */}
                  <div className="flex flex-col md:flex-row items-center gap-4 p-4 border rounded-lg bg-gray-50 mb-4">
                    <img src="/logo.png" alt="BEATO" className="w-12 h-12 rounded-full bg-white border" />
                    <div className="flex-1 text-center md:text-left">
                      <div className="font-semibold">Beato Coin <span className="text-xs text-gray-500">(BEATO)</span></div>
                      <div className="text-sm text-gray-600">Balance: {beatoBalance}</div>
                    </div>
                    <div className="text-center md:text-right mt-2 md:mt-0">
                      <div className="font-bold">{formatUSD(beatoValue)}</div>
                      <div className="text-xs text-gray-500">{formatUSD(beatoValue)} / BEATO</div>
                    </div>
                  </div>
                  {isLoadingTokens ? (
                    <div className="flex justify-center items-center h-32 text-gray-500">
                      <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading tokens...
                    </div>
                  ) : tokensError ? (
                    <div className="text-red-500 text-center">{tokensError}</div>
                  ) : tokens.length === 0 ? (
                    <div className="text-gray-500 text-center">No Other Tokens Found</div>
                  ) : (
                    <div className="space-y-4">
                      {tokens.map((token: any, idx: number) => (
                        <div key={token.address || token.symbol || idx} className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                          <img src={token.logo || '/default-token.png'} alt={token.symbol} className="w-8 h-8 rounded-full bg-white border" />
                          <div className="flex-1">
                            <div className="font-semibold">{token.name} <span className="text-xs text-gray-500">({token.symbol})</span></div>
                            <div className="text-sm text-gray-600">Balance: {token.balance}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                            <div className="text-xs text-gray-500">${token.price.toLocaleString(undefined, { maximumFractionDigits: 4 })} / {token.symbol}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'transactions' && (
                <div className="p-6 bg-white rounded shadow min-h-[200px]">
                  {/* Beato Coin Transactions Block */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-2 text-center">Beato Coin Purchases</h3>
                    {isLoadingCoinTx ? (
                      <div className="flex justify-center items-center h-20 text-gray-500">
                        <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading Beato Coin transactions...
                      </div>
                    ) : coinTxError ? (
                      <div className="text-red-500 text-center">{coinTxError}</div>
                    ) : coinTransactions.length === 0 ? (
                      <div className="text-gray-500 text-center">No Beato Coin purchases found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 bg-blue-50 rounded mb-4">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Transaction ID</th>
                              <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Tokens Purchased</th>
                              <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Total Paid (USD)</th>
                              <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {coinTransactions.map((tx: any) => (
                              <tr key={tx.id}>
                                <td className="px-4 py-2 border-b text-xs break-all">{tx.id}</td>
                                <td className="px-4 py-2 border-b">{tx.tokens_total}</td>
                                <td className="px-4 py-2 border-b">${Number(tx.fiat_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-2 border-b">{tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  {isLoadingTransactions ? (
                    <div className="flex justify-center items-center h-32 text-gray-500">
                      <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading transactions...
                    </div>
                  ) : transactionsError ? (
                    <div className="text-red-500 text-center">{transactionsError}</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-gray-500 text-center">No transactions found.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>From Address</TableHead>
                          <TableHead>To Address</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Asset</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx: any) => (
                          <TableRow key={tx.hash + (tx.uniqueId || '')}>
                            <TableCell className="truncate max-w-[120px]">{tx.from}</TableCell>
                            <TableCell className="truncate max-w-[120px]">{tx.to}</TableCell>
                            <TableCell>{tx.value}</TableCell>
                            <TableCell>{tx.asset}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
              {activeTab === 'redemptions' && (
                <div className="p-6 bg-white rounded shadow min-h-[200px]">
                  <h3 className="text-lg font-bold mb-2 text-center">Redemption Requests</h3>
                  {isLoadingRedemptions ? (
                    <div className="flex justify-center items-center h-20 text-gray-500">
                      <Loader2 className="animate-spin h-6 w-6 mr-2" /> Loading redemption requests...
                    </div>
                  ) : redemptionsError ? (
                    <div className="text-red-500 text-center">{redemptionsError}</div>
                  ) : redemptions.length === 0 ? (
                    <div className="text-gray-500 text-center">No redemption requests found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 bg-blue-50 rounded mb-4">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Tokens Redeemed</th>
                            <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Shipping Address</th>
                            <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Date</th>
                            <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {redemptions.map((r: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 border-b">{r.tokens_redeemed}</td>
                              <td className="px-4 py-2 border-b break-all">{r.shipping_address}</td>
                              <td className="px-4 py-2 border-b">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td>
                              <td className="px-4 py-2 border-b capitalize">{r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disconnect Button for Beato Wallet */}
        {beatoWallet.isConnected && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={beatoWallet.disconnect}
              className="px-[50px] py-3 rounded font-medium bg-[var(--color-accent2)] text-white hover:bg-[var(--color-accent1)] transition"
            >
              Disconnect Wallet
            </button>
          </div>
        )}
        {/* Pretty print API response at the bottom, only if devMode is true */}
        {devMode && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-2">Moralis API Response</h2>
            {isLoadingApi ? (
              <div className="text-gray-500">Loading...</div>
            ) : apiResponse ? (
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-96 whitespace-pre-wrap">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            ) : (
              <div className="text-gray-400">No data loaded yet.</div>
            )}
          </div>
        )}
        {showCreateWalletModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-12 min-w-[320px] max-w-[90vw] flex flex-col items-center">
              <h2 className="text-xl font-bold mb-4">Create Wallet Instructions</h2>
              <ol className="text-left mb-6 list-decimal list-inside space-y-2">
                <li>Click the Create Wallet button.</li>
                <li>Click the <span className="font-semibold">Get Started</span> link.</li>
                <li>Enter your email address in the provided field.</li>
              </ol>
              <button
                onClick={() => {
                  setShowCreateWalletModal(false);
                  emailOnlyModal.open({ view: 'Connect' });
                }}
                className="w-full h-11 bg-[var(--color-accent2)] text-white font-medium text-md rounded mb-4"
              >
                Create Wallet
              </button>
              <button
                onClick={() => setShowCreateWalletModal(false)}
                className="text-gray-500 hover:text-gray-800 text-sm mt-2"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 