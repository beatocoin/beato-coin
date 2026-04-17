"use client"

import { Header } from "@/components/header"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { WalletProviderContextProvider } from "@app/contexts/WalletProviderContext"

export function ClientRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider>
      <WalletProviderContextProvider>
        <div className="min-h-screen bg-background overflow-x-hidden">
          <Header />
          <main className="w-full flex-1 overflow-x-hidden py-0 px-0">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </WalletProviderContextProvider>
    </ThemeProvider>
  )
}
