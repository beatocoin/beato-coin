'use client'

import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WalletProviderContextProvider } from "@app/contexts/WalletProviderContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden`}>
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
      </body>
    </html>
  );
}
