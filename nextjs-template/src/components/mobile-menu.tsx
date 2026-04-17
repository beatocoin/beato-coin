"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MainNavItem } from "@/hooks/use-main-nav-menu"
import { cn } from "@/lib/utils"

function navItemIsActive(pathname: string, href: string) {
  const base = href.split("?")[0] || href
  if (base === "/") return pathname === "/"
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function MobileMenu({ navItems }: { navItems: MainNavItem[] }) {
  const pathname = usePathname()
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
    window.location.href = "/"
    setIsOpen(false)
  }

  const navigateToDashboard = () => {
    if (userId) {
      window.location.href = `/dashboard?UID=${userId}`
    }
    setIsOpen(false)
  }

  const navigateToLogin = () => {
    window.location.href = "/auth"
    setIsOpen(false)
  }

  const navigateToRegister = () => {
    window.location.href = "/auth?tab=register"
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 rounded-lg border-[color-mix(in_srgb,var(--color-dark)_14%,transparent)] bg-white/90 shadow-sm transition-colors hover:bg-[color-mix(in_srgb,var(--color-dark)_4%,white)] lg:hidden"
        aria-expanded={isOpen}
      >
        <Menu className="h-5 w-5 text-[var(--color-dark)]" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,18rem)] max-h-[min(80vh,520px)] overflow-y-auto rounded-xl border border-[color-mix(in_srgb,var(--color-dark)_12%,transparent)] bg-white py-2 shadow-xl ring-1 ring-black/5">
          <div className="border-b border-[color-mix(in_srgb,var(--color-dark)_8%,transparent)] px-2 pb-2">
            <p className="px-2 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-dark)_48%,white)]">
              Menu
            </p>
            {navItems.map((item) => {
              const Icon = item.icon
              const active = navItemIsActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium leading-snug tracking-tight transition-colors",
                    active
                      ? "bg-[color-mix(in_srgb,var(--color-accent1)_14%,transparent)] text-[var(--color-accent1)]"
                      : "text-[var(--color-dark)] hover:bg-[color-mix(in_srgb,var(--color-dark)_5%,transparent)]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-75" aria-hidden />
                  {item.title}
                </Link>
              )
            })}
          </div>
          <div className="pt-1">
            <p className="px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-dark)_48%,white)]">
              Account
            </p>
            {session ? (
              <>
                <button
                  type="button"
                  onClick={navigateToDashboard}
                  className="w-full px-4 py-2.5 text-left text-sm font-medium tracking-tight text-[var(--color-dark)] hover:bg-[color-mix(in_srgb,var(--color-dark)_5%,transparent)]"
                >
                  Dashboard
                </button>
                <a
                  href="/request-payment"
                  className="block w-full px-4 py-2.5 text-left text-sm font-medium tracking-tight text-[var(--color-dark)] hover:bg-[color-mix(in_srgb,var(--color-dark)_5%,transparent)]"
                  onClick={() => setIsOpen(false)}
                >
                  Request Payment
                </a>
                <a
                  href="/transactions"
                  className="block w-full px-4 py-2.5 text-left text-sm font-medium tracking-tight text-[var(--color-dark)] hover:bg-[color-mix(in_srgb,var(--color-dark)_5%,transparent)]"
                  onClick={() => setIsOpen(false)}
                >
                  Transactions
                </a>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-sm font-medium tracking-tight text-[var(--color-dark)] hover:bg-[color-mix(in_srgb,var(--color-dark)_5%,transparent)]"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={navigateToLogin}
                  className="w-full px-4 py-2.5 text-left text-sm font-medium tracking-tight text-[var(--color-dark)] hover:bg-[color-mix(in_srgb,var(--color-dark)_5%,transparent)]"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={navigateToRegister}
                  className="w-full px-4 py-2.5 text-left text-sm font-medium tracking-tight text-[var(--color-dark)] hover:bg-[color-mix(in_srgb,var(--color-dark)_5%,transparent)]"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
