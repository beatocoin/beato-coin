"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@submodule/utils/supabase/client";
import { useAppKitAccount } from "@reown/appkit/react";
import { useWalletProvider } from '@app/contexts/WalletProviderContext';
import useBeatoWalletStore from '../../stores/beatoWalletStore';

export default function RedeemTokenPage() {
  const [beatoCoins, setBeatoCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const beatoWallet = useBeatoWalletStore();
  const appKitAccount = useAppKitAccount();
  const { providerType } = useWalletProvider();

  useEffect(() => {
    const fetchBeatoCoins = async () => {
      setLoading(true);
      setError("");
      try {
        const supabase = createClient();
        let address = "";
        if (beatoWallet.isConnected) {
          address = beatoWallet.address || "";
        } else if (providerType === 'appkit' && appKitAccount.isConnected) {
          address = appKitAccount.address || "";
        } else if (typeof window !== 'undefined' && window.ethereum?.selectedAddress) {
          address = window.ethereum.selectedAddress || "";
        }
        if (!address) {
          setIsLoggedIn(false);
          setBeatoCoins(null);
          setLoading(false);
          return;
        }
        setIsLoggedIn(true);
        const { data, error } = await supabase
          .from("user_wallets")
          .select("beato_coins")
          .eq("public_key", address)
          .maybeSingle();
        if (error) throw error;
        setBeatoCoins(typeof data?.beato_coins === "number" ? data.beato_coins : 0);
      } catch (err: any) {
        setError(err.message || "Failed to fetch Beato Coins");
      } finally {
        setLoading(false);
      }
    };
    fetchBeatoCoins();
  }, [beatoWallet.isConnected, beatoWallet.address, appKitAccount.isConnected, appKitAccount.address, providerType]);

  return (
    <div className="flex flex-col items-center min-h-screen py-8 bg-gray-50">
      <div
        className="w-full max-w-xl bg-white rounded shadow mt-12"
        style={{ padding: '25px 50px', border: '1px solid #d8d8d8' }}
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Redeem Your Beato Coins for Water</h1>
        {loading ? (
          <div className="text-gray-500 text-center">Loading...</div>
        ) : !isLoggedIn ? (
          <div className="text-center text-gray-600">
            Please connect your wallet on the{" "}
            <a href="/wallet" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
              Wallet Page
            </a>{" "}
            to see your redeemable coins.
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <div className="text-center">
            <div className="text-lg text-gray-700 mb-2">Beato Coins Available for Redemption</div>
            <div className="text-4xl font-bold text-blue-700 mb-4">{beatoCoins}</div>
            {beatoCoins === 0 && (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  You have no tokens for redemption, you can purchase them by clicking on the Buy Beato Coin button below.
                </div>
                <a
                  href="/buy-token"
                  className="inline-block px-6 py-3 rounded bg-[var(--color-accent1)] text-white font-semibold text-center hover:bg-[var(--color-accent1-hover,#2563eb)] transition"
                >
                  Buy Beato Coin
                </a>
              </>
            )}
            {typeof beatoCoins === 'number' && beatoCoins > 0 && (
              <RedeemForm maxTokens={beatoCoins} onRedeem={tokensRedeemed => setBeatoCoins(beatoCoins - tokensRedeemed)} walletAddress={(() => {
                if (beatoWallet.isConnected) return beatoWallet.address || "";
                if (providerType === 'appkit' && appKitAccount.isConnected) return appKitAccount.address || "";
                if (typeof window !== 'undefined' && window.ethereum?.selectedAddress) return window.ethereum.selectedAddress || "";
                return "";
              })()} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RedeemForm({ maxTokens, onRedeem, walletAddress }: { maxTokens: number, onRedeem: (tokensRedeemed: number) => void, walletAddress: string }) {
  const [tokens, setTokens] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const tokensNum = Number(tokens);
    if (!tokens.trim() || isNaN(tokensNum) || tokensNum <= 0 || !Number.isInteger(tokensNum)) {
      setError('Please enter a valid number of tokens to redeem.');
      return;
    }
    if (tokensNum > maxTokens) {
      setError('You cannot redeem more tokens than you have.');
      return;
    }
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!address.trim()) {
      setError('Address is required.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Fetch latest beato_coins value
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('beato_coins')
        .eq('public_key', walletAddress)
        .maybeSingle();
      if (walletError) throw walletError;
      const currentBeatoCoins = typeof walletData?.beato_coins === 'number' ? walletData.beato_coins : 0;
      if (tokensNum > currentBeatoCoins) {
        setError('You cannot redeem more tokens than you have.');
        setLoading(false);
        return;
      }
      // Subtract redeemed tokens from beato_coins
      const newBeatoCoins = currentBeatoCoins - tokensNum;
      const { error: updateError } = await supabase
        .from('user_wallets')
        .update({ beato_coins: newBeatoCoins })
        .eq('public_key', walletAddress);
      if (updateError) throw updateError;
      // Insert redemption request
      const { error: insertError } = await supabase
        .from('redemption_requests')
        .insert([
          {
            UID: user.id,
            tokens_redeemed: tokensNum,
            shipping_address: address,
          }
        ]);
      if (insertError) throw insertError;
      setSuccess('Redemption request submitted!');
      onRedeem(tokensNum);
      setTokens('');
      setName('');
      setAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to complete redemption.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left max-w-md mx-auto">
      <div>
        <label htmlFor="tokens" className="block text-sm font-medium text-gray-700 mb-1">Number of Tokens to Redeem</label>
        <input
          id="tokens"
          name="tokens"
          type="number"
          min="1"
          max={maxTokens}
          step="1"
          value={tokens}
          onChange={e => setTokens(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Max: ${maxTokens}`}
          required
        />
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your name"
          required
        />
      </div>
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
        <input
          id="address"
          name="address"
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter address for water delivery"
          required
        />
      </div>
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      {success && <div className="text-green-600 text-sm mt-1">{success}</div>}
      <button
        type="submit"
        className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Complete Redemption'}
      </button>
    </form>
  );
} 