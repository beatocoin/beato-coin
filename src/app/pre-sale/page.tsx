'use client';

import { useEffect, useState } from 'react';
import AppKitWalletConnectButton from '@app/components/crypto/app-kit/WalletConnectButton';
import MoralisWalletConnectButton from '@app/components/crypto/moralis/WalletConnectButton';
import AppKitBuyCryptoButton from '@app/components/crypto/app-kit/BuyCryptoButton';
import MoralisBuyCryptoButton from '@app/components/crypto/moralis/BuyCryptoButton';
import { ProgressBar } from '@app/components/ui/progress-bar';
import { createClient } from '@submodule/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@submodule/components/ui/card';
import Loading from '@submodule/components/ui/loading';

interface CryptoSettings {
  hard_cap: number;
  starting_funds: number;
  wallet_provider?: string;
}

export default function PreSalePage() {
  const [settings, setSettings] = useState<CryptoSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [walletProvider, setWalletProvider] = useState<'appkit' | 'moralis'>('appkit');
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('crypto_settings')
          .select('hard_cap, starting_funds, wallet_provider')
          .single();

        if (error) throw error;
        
        // Set the wallet provider if it exists
        if (data.wallet_provider === 'moralis') {
          setWalletProvider('moralis');
        } else {
          setWalletProvider('appkit');
        }
        
        setSettings({
          hard_cap: Number(data.hard_cap) || 0,
          starting_funds: Number(data.starting_funds) || 0,
          wallet_provider: data.wallet_provider
        });
      } catch (error) {
        console.error('Error fetching crypto settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [supabase]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return <Loading />;
  }

  const hardCap = settings?.hard_cap || 0;
  const currentFunds = settings?.starting_funds || 0;
  const remainingGoal = hardCap - currentFunds;

  // Determine which wallet buttons to use based on wallet provider
  const WalletConnectButton = walletProvider === 'moralis' 
    ? MoralisWalletConnectButton 
    : AppKitWalletConnectButton;
    
  const BuyCryptoButton = walletProvider === 'moralis'
    ? MoralisBuyCryptoButton
    : AppKitBuyCryptoButton;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Botanicoin Pre-Sale</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Progress Info */}
          <Card className="h-full">
            <CardHeader className="md:px-[50px]">
              <CardTitle>Fundraising Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 md:px-[50px]">
              {/* Progress Bar */}
              <ProgressBar current={currentFunds} total={hardCap} />
              
              {/* Progress Stats */}
              <div className="flex justify-between items-center pt-4">
                <div className="text-center p-3 border border-[#d8d8d8] rounded-md bg-white w-full mx-1">
                  <p className="text-sm text-gray-500">Total Committed</p>
                  <p className="text-2xl font-semibold text-[var(--color-accent1)]">{formatCurrency(currentFunds)}</p>
                </div>
                <div className="text-center p-3 border border-[#d8d8d8] rounded-md bg-white w-full mx-1">
                  <p className="text-sm text-gray-500">Remaining Goal</p>
                  <p className="text-2xl font-semibold text-[var(--color-primary)]">{formatCurrency(remainingGoal)}</p>
                </div>
                <div className="text-center p-3 border border-[#d8d8d8] rounded-md bg-white w-full mx-1">
                  <p className="text-sm text-gray-500">Hard Cap</p>
                  <p className="text-2xl font-semibold text-[var(--color-accent1)]">{formatCurrency(hardCap)}</p>
                </div>
              </div>
              
              {/* Connect Wallet and Buy Crypto Section */}
              <div className="mt-8 text-center">
                <h3 className="text-xl font-semibold mb-4">Participate in Pre-Sale</h3>
                <p className="text-gray-600 mb-6">Connect your wallet to participate in our token pre-sale</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-center items-center">
                    <WalletConnectButton size="lg" className="px-[50px] w-auto min-w-[172px]" />
                  </div>
                  <div className="flex justify-center items-center">
                    <div className="flex items-center space-x-2">
                      <BuyCryptoButton size="lg" className="px-[50px]">Buy Crypto</BuyCryptoButton>
                      <div className="group relative">
                        <div className="flex items-center text-gray-500 cursor-help">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                          </svg>
                        </div>
                        <div className="absolute left-0 top-0 mt-6 w-72 scale-0 rounded bg-gray-800 p-2 text-xs text-white group-hover:scale-100 z-10 transition-all duration-100 origin-top-left text-left">
                          You can easily buy crypto with fiat (USD) to participate in the pre-sale by connecting a wallet and clicking this button.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Right Column - Info */}
          <Card className="h-full">
            <CardHeader className="md:px-[50px]">
              <CardTitle>Pre-Sale Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:px-[50px]">
              <div className="text-gray-600">
                <h3 className="text-lg font-semibold mb-2">About Botanicoin</h3>
                <p className="mb-4">
                  Botanicoin is the native token for the Botanicoin Payment Platform, designed to revolutionize transactions in the botanical industry.
                </p>
                
                <h3 className="text-lg font-semibold mb-2">Token Details</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Total Supply: 100,000,000 Tokens</li>
                  <li>Pre-Sale Price: $0.10 per token</li>
                  <li>Minimum Purchase: 100 Tokens</li>
                </ul>
                
                <h3 className="text-lg font-semibold mt-4 mb-2">Benefits</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Early access to the Botanicoin ecosystem</li>
                  <li>Reduced transaction fees</li>
                  <li>Staking rewards for token holders</li>
                  <li>Voting rights on platform developments</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 