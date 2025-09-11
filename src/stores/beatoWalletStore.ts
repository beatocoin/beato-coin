import { create } from 'zustand';
import { ethers } from 'ethers';

interface BeatoWalletState {
  isConnected: boolean;
  address: string | null;
  wallet: ethers.Wallet | null;
  connect: (privateKey: string) => void;
  disconnect: () => void;
}

const useBeatoWalletStore = create<BeatoWalletState>((set) => ({
  isConnected: false,
  address: null,
  wallet: null,
  connect: (privateKey: string) => {
    try {
      const wallet = new ethers.Wallet(privateKey);
      set({
        isConnected: true,
        address: wallet.address,
        wallet,
      });
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('beatoWalletPrivateKey', privateKey);
      }
    } catch (e) {
      set({ isConnected: false, address: null, wallet: null });
    }
  },
  disconnect: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('beatoWalletPrivateKey');
    }
    set({ isConnected: false, address: null, wallet: null });
  },
}));

// Rehydrate on load
if (typeof window !== 'undefined') {
  const privateKey = localStorage.getItem('beatoWalletPrivateKey');
  if (privateKey) {
    useBeatoWalletStore.getState().connect(privateKey);
  }
}

export default useBeatoWalletStore; 