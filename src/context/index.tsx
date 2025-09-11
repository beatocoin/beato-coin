'use client'

import { wagmiAdapter, projectId, networks, solanaAdapter, bitcoinAdapter } from '@app/config/index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Determine the domain based on environment
const isDevelopment = process.env.NODE_ENV === 'development'
const domain = isDevelopment ? 'http://localhost:3000' : 'https://ai-crypto.com'

// Set up metadata
const metadata = {
  name: 'Gevi-AI',
  description: 'GEVI AI Crypto App',
  url: domain, 
  icons: [`${domain}/logo.png`]
}

// Default modal: all wallets + email
export const modal = createAppKit({
  adapters: [wagmiAdapter, solanaAdapter, bitcoinAdapter],
  projectId,
  networks: [networks[0], ...networks.slice(1)],
  defaultNetwork: networks[0],
  metadata: metadata,
  features: {
    email: true,
    socials: [], // or add socials if you want
    analytics: true,
  },
  // allWallets: not set or 'SHOW' (default)
})

// Email-only modal: only email, no wallets
export const emailOnlyModal = createAppKit({
  adapters: [wagmiAdapter, solanaAdapter, bitcoinAdapter],
  projectId,
  networks: [networks[0], ...networks.slice(1)],
  defaultNetwork: networks[0],
  metadata: metadata,
  features: {
    email: true,
    socials: [],
    analytics: true,
    emailShowWallets: false, // Only show email, hide wallets in email modal
  },
  allWallets: 'HIDE', // Hide all wallets, only show email
})

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider 