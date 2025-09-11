'use client'

import { NavButtons } from "@/components/nav-buttons"
import { MobileMenu } from "@/components/mobile-menu"
import { useEffect, useState } from "react"
import { getSiteName, DEFAULT_SITE_NAME, subscribeToSiteNameChanges } from "@/utils/site-name"
import Loading from "@/components/ui/loading"

export function Header() {
  const [siteName, setSiteName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSiteName = async () => {
      setIsLoading(true)
      const name = await getSiteName()
      setSiteName(name)
      setIsLoading(false)
    }
    
    // Load initial site name
    loadSiteName()

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSiteNameChanges((newName) => {
      setSiteName(newName)
    })

    // Cleanup subscription on unmount
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <header className="w-full border-b bg-white/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="text-xl font-bold text-[var(--color-dark)]">
          {isLoading ? <Loading size="sm" text="" /> : siteName}
        </div>
        <nav className="hidden md:flex gap-14 items-center text-base font-semibold">
          <NavButtons />
        </nav>
        <div className="md:hidden flex items-center">
          <MobileMenu />
        </div>
      </div>
    </header>
  )
} 