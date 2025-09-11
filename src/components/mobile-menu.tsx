"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState<boolean>(false)
  const [userId, setUserId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setSession(!!user)
      setUserId(user?.id || null)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    
    return () => {
      subscription.unsubscribe()
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
    setIsOpen(false)
  }

  const navigateToDashboard = () => {
    if (userId) {
      window.location.href = `/dashboard?UID=${userId}`
    }
    setIsOpen(false)
  }

  const navigateToLogin = () => {
    window.location.href = '/auth'
    setIsOpen(false)
  }

  const navigateToRegister = () => {
    window.location.href = '/auth?tab=register'
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden flex border border-[#d8d8d8] rounded-[10px] p-2"
      >
        <Menu className="h-7 w-7" style={{ color: 'var(--color-primary)' }} />
        <span className="sr-only">Toggle menu</span>
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#fafafa] border border-[#d8d8d8] rounded-md shadow-lg py-1 z-50">
          {session ? (
            <>
              <button
                onClick={navigateToDashboard}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Dashboard
              </button>
              <a
                href="/wallet"
                className="w-full block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Wallet
              </a>
              <a
                href="/request-payment"
                className="w-full block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Request Payment
              </a>
              <a
                href="/transactions"
                className="w-full block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Transactions
              </a>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={navigateToLogin}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Log In
              </button>
              <button
                onClick={navigateToRegister}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Register
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
} 