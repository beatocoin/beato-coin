import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { createClient } from '@submodule/utils/supabase/client';
import useBeatoWalletStore from '@app/stores/beatoWalletStore';
import { useWalletProvider } from '@app/contexts/WalletProviderContext';
import ConnectBeatoWalletModal from '@app/components/crypto/ConnectBeatoWalletModal';

function hashPin(pin: string, salt: string) {
  // Use subtle crypto for PBKDF2
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  ).then(key =>
    window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  );
}

async function encryptPrivateKey(privateKey: string, pin: string) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const key = await hashPin(pin, Buffer.from(salt).toString('base64'));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(privateKey)
  );
  return {
    encryptedPrivateKey: Buffer.from(encrypted).toString('base64'),
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
  };
}

interface EVMWalletCreateButtonProps {
  className?: string;
  showConnectBeatoButton?: boolean;
}

export default function EVMWalletCreateButton({ className = '', showConnectBeatoButton = false }: EVMWalletCreateButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { isConnected: beatoConnected, connect: connectBeatoWallet } = useBeatoWalletStore();
  const { providerType } = useWalletProvider();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Determine if any wallet is connected (AppKit, Moralis, or Beato)
  const anyWalletConnected = beatoConnected || providerType === 'appkit' || providerType === 'moralis';

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkUser();
  }, []);

  const handleCreateWallet = async () => {
    setShowModal(true);
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be 4 digits.');
      return;
    }
    if (pin !== pinConfirm) {
      setError('PINs do not match.');
      return;
    }
    setIsLoading(true);
    try {
      // 1. Create wallet
      const wallet = ethers.Wallet.createRandom();
      // 2. Encrypt private key
      const { encryptedPrivateKey, salt, iv } = await encryptPrivateKey(wallet.privateKey, pin);
      // 3. Hash PIN (store salt and hash)
      const pinSalt = window.crypto.getRandomValues(new Uint8Array(16));
      const pinKey = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + Buffer.from(pinSalt).toString('base64')));
      const pinHash = Buffer.from(pinKey).toString('base64');
      // 4. Store in Supabase
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error: dbError } = await supabase.from('user_wallets').insert({
        UID: user.id,
        email: user.email,
        user_role: 'subscriber',
        public_key: wallet.address,
        private_key: encryptedPrivateKey,
        pin_hash: pinHash,
        pin_salt: Buffer.from(pinSalt).toString('base64'),
        salt,
        iv,
        auth_tag: '', // Not used with AES-GCM WebCrypto
        pin_attempt_count: 0,
        last_pin_attempt: new Date().toISOString(),
        wallet_type: 'beato',
      });
      if (dbError) throw dbError;
      // 5. Auto-connect the wallet using Zustand store
      connectBeatoWallet(wallet.privateKey);
      setSuccess(true);
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
    } finally {
      setIsLoading(false);
      setPin('');
      setPinConfirm('');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <a
          href="/auth"
          className="w-full h-11 whitespace-nowrap overflow-hidden text-ellipsis font-medium text-md flex items-center justify-center text-center bg-[var(--color-primary)] text-white"
        >
          Create a Free Account
        </a>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 w-full">
      <button
        type="button"
        onClick={handleCreateWallet}
        className={`w-full h-11 whitespace-nowrap overflow-hidden text-ellipsis font-medium text-md flex items-center justify-center text-center bg-[var(--color-primary)] text-white ${className}`}
      >
        Create Beato Wallet
      </button>
      {showConnectBeatoButton && (
        <>
          <button
            type="button"
            className="w-full h-11 whitespace-nowrap overflow-hidden text-ellipsis font-medium text-md flex items-center justify-center text-center border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
            onClick={() => setShowConnectModal(true)}
          >
            Connect Beato Wallet
          </button>
          <ConnectBeatoWalletModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />
        </>
      )}
      {success && (
        <div className="mt-3 w-full text-center">
          <div className="text-green-700 font-bold text-lg bg-green-100 border border-green-300 rounded px-4 py-3 shadow-md animate-fade-in">
            Your Beato Wallet has been created successfully.
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-[50px] w-[500px] max-w-[95vw] flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-2 text-center">Create Your Beato Wallet</h1>
            <p className="text-gray-600 mb-6 text-center">
              Create your Beato Wallet by entereing a 4 digit Pin. Your Beato Wallet in protected with your login Email and Password, Your 4 Digit PIN, in addition to a Private and Public Salt Key.
            </p>
            <h2 className="text-xl font-bold mb-4">Set a 4-digit PIN</h2>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              minLength={4}
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="mb-2 border rounded px-3 py-2 text-center text-lg"
              placeholder="Enter PIN"
              required
              autoFocus
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              minLength={4}
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value)}
              className="mb-4 border rounded px-3 py-2 text-center text-lg"
              placeholder="Confirm PIN"
              required
            />
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[var(--color-primary)] text-white font-medium text-md rounded mb-2"
            >
              {isLoading ? 'Creating...' : 'Create Wallet'}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="text-gray-500 hover:text-gray-800 text-sm mt-2"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
} 