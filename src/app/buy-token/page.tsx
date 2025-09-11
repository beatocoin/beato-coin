'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@submodule/utils/supabase/client';
import CountdownClock from '../../components/CountdownClock';
import { format } from 'date-fns';
import Loading from '../../components/ui/loading';

export default function BuyTokenPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [error, setError] = useState('');
  const [wallets, setWallets] = useState<any[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [walletsError, setWalletsError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [cardholder, setCardholder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const progressSteps = [
    'Completing Card Transaction',
    'Updating Beato Crypto Payments',
    'Sending Beato Coin to Your Wallet',
    'Finalizing Transaction',
  ];
  const [receipt, setReceipt] = useState<{ id: string; tokens_total: number; fiat_total: number } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tokenLive, setTokenLive] = useState(true);
  const [presaleEndDate, setPresaleEndDate] = useState<Date | null>(null);
  const [tokenName, setTokenName] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);

  const tokenPrice = 27.6;
  const total = tokenAmount && !isNaN(Number(tokenAmount)) && Number(tokenAmount) > 0
    ? Number(tokenAmount) * tokenPrice
    : 0;

  useEffect(() => {
    const fetchWallets = async () => {
      setLoadingWallets(true);
      setWalletsError('');
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error: dbError } = await supabase
          .from('user_wallets')
          .select('public_key, balance_usd, wallet_type')
          .eq('UID', user.id);
        if (dbError) throw dbError;
        setWallets(data || []);
      } catch (err: any) {
        setWalletsError(err.message || 'Failed to fetch wallets');
      } finally {
        setLoadingWallets(false);
      }
    };
    fetchWallets();
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkUser();
  }, []);

  // Real-time subscription for user_wallets table
  useEffect(() => {
    let supabase = createClient();
    let subscription: any = null;
    let isMounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      subscription = supabase
        .channel('user_wallets_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_wallets',
            filter: `UID=eq.${user.id}`,
          },
          (payload: any) => {
            if (!isMounted) return;
            setWallets((prevWallets) => {
              if (payload.eventType === 'DELETE') {
                return prevWallets.filter(w => w.public_key !== payload.old.public_key);
              }
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const updated = prevWallets.filter(w => w.public_key !== payload.new.public_key);
                return [...updated, payload.new];
              }
              return prevWallets;
            });
          }
        )
        .subscribe();
    })();
    return () => {
      isMounted = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  useEffect(() => {
    if (showModal && progressStep < progressSteps.length) {
      const timer = setTimeout(() => {
        setProgressStep((prev) => prev + 1);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showModal, progressStep, progressSteps.length]);

  useEffect(() => {
    if (!showModal) setProgressStep(0);
  }, [showModal]);

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crypto_settings')
        .select('token_live, presale_end_date, token_name')
        .single();
      if (!error && data) {
        setTokenLive(data.token_live ?? true);
        setTokenName(data.token_name || 'the token');
        setPresaleEndDate(data.presale_end_date ? new Date(data.presale_end_date) : null);
      }
      setSettingsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim()) {
      setError('Wallet address is required.');
      return;
    }
    if (!tokenAmount.trim() || isNaN(Number(tokenAmount)) || Number(tokenAmount) <= 0 || !Number.isInteger(Number(tokenAmount))) {
      setError('Please enter a valid number of tokens to buy.');
      return;
    }
    if (!cardholder.trim()) {
      setError('Cardholder name is required.');
      return;
    }
    if (!cardNumber.trim()) {
      setError('Credit card number is required.');
      return;
    }
    if (!expiry.trim()) {
      setError('Expiration date is required.');
      return;
    }
    if (!cvv.trim()) {
      setError('CVV is required.');
      return;
    }
    setError('');
    setPurchaseError('');
    setPurchaseSuccess(false);
    setLoadingPurchase(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const purchase_price = 27.6;
      const tokens_total = Number(tokenAmount);
      const fiat_total = purchase_price * tokens_total;

      // Check if the wallet address exists for this user
      const { data: walletData, error: walletFetchError } = await supabase
        .from('user_wallets')
        .select('balance_usd, beato_coins')
        .eq('UID', user.id)
        .eq('public_key', walletAddress)
        .single();
      if (walletFetchError && walletFetchError.code !== 'PGRST116') throw walletFetchError;
      if (walletData) {
        // Update the balance_usd by adding fiat_total
        const newBalance = (typeof walletData.balance_usd === 'number' ? walletData.balance_usd : 0) + fiat_total;
        const newBeatoCoins = (typeof walletData.beato_coins === 'number' ? walletData.beato_coins : 0) + tokens_total;
        const { error: updateError } = await supabase
          .from('user_wallets')
          .update({ balance_usd: newBalance, beato_coins: newBeatoCoins })
          .eq('UID', user.id)
          .eq('public_key', walletAddress);
        if (updateError) throw updateError;
      }

      const { data: insertData, error: insertError } = await supabase
        .from('coin_transactions')
        .insert([
          {
            UID: user.id,
            name: cardholder,
            public_address: walletAddress,
            card_number: cardNumber,
            expieration_date: expiry,
            cvv: cvv,
            purchase_price,
            tokens_total,
            fiat_total,
          }
        ])
        .select('id, tokens_total, fiat_total')
        .single();
      if (insertError) throw insertError;
      setReceipt(insertData ? {
        id: insertData.id,
        tokens_total: insertData.tokens_total,
        fiat_total: insertData.fiat_total,
      } : null);
      setPurchaseSuccess(true);
      setCardholder('');
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setWalletAddress('');
      setTokenAmount('');
      setShowModal(true);
    } catch (err: any) {
      setPurchaseError(err.message || 'Failed to complete purchase.');
    } finally {
      setLoadingPurchase(false);
    }
  };

  const handleCopy = (publicKey: string) => {
    navigator.clipboard.writeText(publicKey);
    setCopiedKey(publicKey);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Format card number with spaces every 4 digits
  const formatCardNumber = (value: string) => {
    return value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
  };

  // Format expiry as MM/YY
  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
  };

  if (settingsLoading) {
    return (
      <div className="flex flex-col items-center min-h-screen py-8 bg-gray-50">
        <Loading />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen py-8 bg-gray-50">
      {/* Modal for progress bar and success message */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="bg-white rounded-lg shadow-lg w-full flex flex-col items-center relative"
            style={{
              padding: '25px 50px',
              width: '95%',
              maxWidth: '750px',
              border: '3px solid #d8d8d8',
            }}
          >
            {/* Close button, only show after progress is complete */}
            {progressStep >= progressSteps.length && (
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                style={{ lineHeight: 1 }}
              >
                ×
              </button>
            )}
            {progressStep < progressSteps.length ? (
              <>
                <h2 className="text-xl font-bold mb-6 text-center">Processing Your Purchase</h2>
                <div className="w-full mb-4">
                  <div className="flex justify-between mb-2">
                    {progressSteps.map((step, idx) => (
                      <span key={step} className={`text-xs ${idx === progressStep ? 'font-bold text-blue-700' : 'text-gray-400'}`}>{idx + 1}</span>
                    ))}
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${((progressStep) / progressSteps.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="w-full text-center text-base font-medium text-gray-700 min-h-[32px] flex items-center justify-center">
                  {progressSteps[progressStep]}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-4 text-center">Purchase Complete</h2>
                <p className="text-gray-700 text-center mb-6">Your purchase was successful. We have transfered the tokens to your provided wallet address. You can go to the Wallet page to see your token balance.</p>
                {receipt && (
                  <div className="w-full max-w-[550px] mx-auto mb-6 p-4 rounded-lg border-2 border-blue-200 bg-blue-50 shadow text-center">
                    <h3 className="text-lg font-semibold mb-2 text-blue-800">Purchase Receipt</h3>
                    <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Transaction ID:</span> <span className="break-all">{receipt.id}</span></div>
                    <div className="text-sm text-gray-700 mb-1"><span className="font-medium">Tokens Purchased:</span> {receipt.tokens_total}</div>
                    <div className="text-sm text-gray-700"><span className="font-medium">Total Paid (USD):</span> ${Number(receipt.fiat_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                )}
                <a
                  href="/wallet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-[450px] mx-auto py-3 px-6 rounded bg-[var(--color-accent1)] text-white font-semibold text-center hover:bg-[var(--color-accent1-hover,#2563eb)] transition block"
                >
                  Go To My Wallet
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* If token is not live, show countdown clock and explanation */}
      {!tokenLive && presaleEndDate ? (
        <div className="w-full flex flex-col items-center justify-center py-12">
          <CountdownClock endDate={presaleEndDate} />
          <div
            className="mt-8 text-center"
            style={{
              border: '1px solid #d8d8d8',
              padding: '25px 50px',
              borderRadius: '16px',
              background: '#fff',
              display: 'inline-block',
              maxWidth: '95%',
            }}
          >
            <h2 className="text-3xl md:text-4xl font-extrabold mb-2 text-blue-800 drop-shadow-sm">{tokenName} Sale Coming Soon</h2>
            <p className="text-lg md:text-xl text-gray-700 mb-2 font-medium">
              {tokenName} will be available for purchase when the countdown clock reaches zero.
            </p>
            <p className="text-base md:text-lg text-gray-600">
              Sale opens <span className="font-semibold text-blue-700">{format(presaleEndDate, 'MMMM do, yyyy')}</span>
            </p>
            <p className="text-base text-gray-500 mt-4">
              Create your wallet now to be eligible for AirDrops and exclusive pre-launch benefits.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="w-full max-w-md bg-white rounded shadow"
            style={{ padding: 25, border: '1px solid #d8d8d8' }}
          >
            <h1 className="text-2xl font-bold mb-6 text-center">Buy Beato Coin</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Wallet Address
                </label>
                <input
                  id="walletAddress"
                  name="walletAddress"
                  type="text"
                  value={walletAddress}
                  onChange={e => setWalletAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your wallet address"
                  required
                />
              </div>
              <div className="flex flex-col items-center mb-2">
                <span className="text-xl font-bold text-gray-800">Total: <span className="text-2xl font-extrabold text-blue-700">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
              </div>
              <div>
                <label htmlFor="tokenAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Tokens to Buy
                </label>
                <input
                  id="tokenAmount"
                  name="tokenAmount"
                  type="number"
                  min="1"
                  step="1"
                  value={tokenAmount}
                  onChange={e => setTokenAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter number of tokens"
                  required
                />
              </div>
              <div>
                <label htmlFor="cardholder" className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  id="cardholder"
                  name="cardholder"
                  type="text"
                  value={cardholder}
                  onChange={e => setCardholder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name on card"
                  required
                />
              </div>
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Card Number
                </label>
                <input
                  id="cardNumber"
                  name="cardNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={formatCardNumber(cardNumber)}
                  onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1234 5678 9012 3456"
                  required
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date
                  </label>
                  <input
                    id="expiry"
                    name="expiry"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={formatExpiry(expiry)}
                    onChange={e => setExpiry(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MM/YY"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                    CVV
                  </label>
                  <input
                    id="cvv"
                    name="cvv"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvv}
                    onChange={e => setCvv(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CVV"
                    required
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              {isLoggedIn ? (
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
                  disabled={loadingPurchase}
                >
                  {loadingPurchase ? 'Processing...' : 'Complete Purchase'}
                </button>
              ) : (
                <>
                  <a
                    href="/auth"
                    className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition text-center block"
                  >
                    Create Free Account
                  </a>
                  <p className="text-center text-gray-600 mt-2 text-xs">Please Create a Free Account or Login to Purchase Beato Coin</p>
                </>
              )}
              {purchaseSuccess && (
                <p className="text-green-600 text-center mt-2 font-semibold">Purchase completed successfully!</p>
              )}
              {purchaseError && (
                <p className="text-red-600 text-center mt-2 font-semibold">{purchaseError}</p>
              )}
            </form>
          </div>
          {isLoggedIn && (
            <div className="w-full max-w-4xl mt-8">
              <h2 className="text-lg font-semibold mb-2 text-center">Your Connected Wallets</h2>
              <p className="text-sm text-gray-600 text-left mb-4 max-w-2xl mx-auto">
                Below are the wallet addresses you have previously connected to Beato Crypto. You can create or connect a wallet on the Wallet Page by clicking on the Create Wallet button below.
              </p>
              {loadingWallets ? (
                <div className="text-gray-500">Loading wallets...</div>
              ) : walletsError ? (
                <div className="text-red-500">{walletsError}</div>
              ) : wallets.length === 0 ? (
                <div className="text-gray-500">No wallets connected.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[700px] w-full border border-gray-200 bg-white rounded">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Wallet Address</th>
                        <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Balance (USD)</th>
                        <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Wallet Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wallets.map((wallet: any) => (
                        <tr key={wallet.public_key}>
                          <td className="px-4 py-2 border-b text-xs break-all flex items-center gap-2">
                            {wallet.public_key}
                            <button
                              type="button"
                              aria-label="Copy wallet address"
                              onClick={() => handleCopy(wallet.public_key)}
                              className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 focus:outline-none"
                            >
                              {copiedKey === wallet.public_key ? 'Copied!' : 'Copy'}
                            </button>
                          </td>
                          <td className="px-4 py-2 border-b">${typeof wallet.balance_usd === 'number' ? wallet.balance_usd.toFixed(2) : '0.00'}</td>
                          <td className="px-4 py-2 border-b capitalize">{wallet.wallet_type ? wallet.wallet_type.charAt(0).toUpperCase() + wallet.wallet_type.slice(1) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-center mt-6">
                <a
                  href="/wallet"
                  className="w-full md:w-auto px-6 py-3 rounded text-white font-semibold text-center bg-[var(--color-accent1)] hover:bg-[var(--color-accent1-hover, #2563eb)] transition"
                >
                  Create Wallet
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 