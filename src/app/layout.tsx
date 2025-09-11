'use client'

import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WalletProviderContextProvider } from "@app/contexts/WalletProviderContext";
import { useState, useEffect } from "react";
import { SidebarContext } from "@/contexts/SidebarContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Only run on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
    
    // Check if there's a saved preference in localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    
    if (savedState !== null) {
      // Use saved preference if it exists
      setIsCollapsed(savedState === 'true');
    } else {
      // Otherwise set based on screen size
      const isMobile = window.innerWidth < 640;
      setIsCollapsed(isMobile);
      localStorage.setItem('sidebarCollapsed', isMobile.toString());
    }

    // Add resize listener to update sidebar state on window resize
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      // Only auto-collapse/expand if user hasn't set a preference
      if (localStorage.getItem('sidebarCollapsed') === null) {
        setIsCollapsed(isMobile);
        localStorage.setItem('sidebarCollapsed', isMobile.toString());
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden`}>
        <ThemeProvider>
          <WalletProviderContextProvider>
            <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
              <div className="min-h-screen bg-background overflow-x-hidden">
                <Header />
                <div className="flex">
                  <Sidebar />
                  {isClient && (
                    <main className={`flex-1 py-0 px-0 overflow-x-hidden transition-all duration-300 ${isCollapsed ? 'sm:pl-16' : 'sm:pl-0'}`}>
                      <div className="w-full">
                        {children}
                      </div>
                    </main>
                  )}
                </div>
              </div>
            </SidebarContext.Provider>
          </WalletProviderContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
