import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin'
import { mainnet, arbitrum, solana, bitcoin } from '@reown/appkit/networks'

// Get projectId from .env file
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Define networks for the app
const networkList = [mainnet, arbitrum, solana, bitcoin]
export const networks = networkList

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks: networkList
})

// Create Solana adapter
export const solanaAdapter = new SolanaAdapter()

// Create Bitcoin adapter
export const bitcoinAdapter = new BitcoinAdapter({
  projectId
})

export const config = wagmiAdapter.wagmiConfig 