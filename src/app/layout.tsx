import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClientRootLayout } from "./client-root-layout"

const inter = Inter({ subsets: ["latin"] })

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL &&
  /^https?:\/\//i.test(process.env.NEXT_PUBLIC_SITE_URL)
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Beato Coin ($BEATO) | Water-Backed ERC-20 on Ethereum Mainnet",
    template: "%s | Beato Coin",
  },
  description:
    "Buy Beato Coin ($BEATO) to reserve future drinking water. Ethereum Mainnet ERC-20 with redeemable inventory—create an account, connect a wallet, and purchase $BEATO securely.",
  keywords: [
    "Beato Coin",
    "BEATO",
    "$BEATO",
    "water token",
    "ERC-20",
    "Ethereum",
    "tokenized water",
    "water security",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Beato Coin",
    title:
      "Beato Coin ($BEATO) | Water-Backed ERC-20 on Ethereum",
    description:
      "Secure future water supply with Beato Coin—ERC-20 utility on Ethereum Mainnet, redeemable cases, and a clear path from account to wallet to purchase.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Beato Coin ($BEATO) | Water-Backed Crypto on Ethereum",
    description:
      "Tokenized water security: buy $BEATO, hold on-chain, and redeem when you need it. Ethereum Mainnet ERC-20.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden`}>
        <ClientRootLayout>{children}</ClientRootLayout>
      </body>
    </html>
  )
}
