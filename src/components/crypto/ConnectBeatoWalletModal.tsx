import React, { useEffect, useState } from 'react';
import { createClient } from '@submodule/utils/supabase/client';
import useBeatoWalletStore from '@app/stores/beatoWalletStore';
import { ethers } from 'ethers';

interface ConnectBeatoWalletModalProps {
  open: boolean;
  onClose: () => void;
}

async function decryptPrivateKey(encrypted: string, pin: string, iv: string, authTag: string, salt: string) {
  // AES-GCM decryption using browser crypto
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
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
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: Buffer.from(iv, 'base64'),
      // authTag is not used in WebCrypto AES-GCM
    },
    key,
    Buffer.from(encrypted, 'base64')
  );
  return new TextDecoder().decode(decrypted);
}

export default function ConnectBeatoWalletModal({ open, onClose }: ConnectBeatoWalletModalProps) {
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { connect } = useBeatoWalletStore();

  useEffect(() => {
    if (!open) return;
    const fetchWallets = async () => {
      setIsLoading(true);
      setError('');
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error: dbError } = await supabase
          .from('user_wallets')
          .select('*')
          .eq('UID', user.id)
          .eq('wallet_type', 'beato');
        if (dbError) throw dbError;
        setWallets(data || []);
        if (data && data.length > 0) setSelectedWallet(data[0].public_key);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch wallets');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWallets();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const wallet = wallets.find(w => w.public_key === selectedWallet);
      if (!wallet) throw new Error('Wallet not found');
      const privateKey = await decryptPrivateKey(
        wallet.private_key,
        pin,
        wallet.iv,
        wallet.auth_tag,
        wallet.salt
      );
      // Validate private key
      new ethers.Wallet(privateKey); // throws if invalid
      connect(privateKey);
      onClose();
    } catch (err: any) {
      setError('Invalid PIN or failed to decrypt wallet.');
    } finally {
      setIsLoading(false);
      setPin('');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-[50px] w-[500px] max-w-[95vw] flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-2 text-center">Connect Your Beato Wallet</h1>
        <p className="text-gray-600 mb-6 text-center">
          Select your Beato Wallet and enter your 4-digit PIN to connect.
        </p>
        <label className="mb-2 font-medium w-full text-left">Select Wallet</label>
        <select
          className="mb-4 border rounded px-3 py-2 w-full text-lg"
          value={selectedWallet}
          onChange={e => setSelectedWallet(e.target.value)}
          required
        >
          {wallets.map(w => (
            <option key={w.public_key} value={w.public_key}>{w.public_key}</option>
          ))}
        </select>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          minLength={4}
          value={pin}
          onChange={e => setPin(e.target.value)}
          className="mb-4 border rounded px-3 py-2 text-center text-lg"
          placeholder="Enter PIN"
          required
        />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[var(--color-primary)] text-white font-medium text-md rounded mb-2"
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 text-sm mt-2"
        >
          Cancel
        </button>
      </form>
    </div>
  );
} 