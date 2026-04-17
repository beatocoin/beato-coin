"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"
import React, { useEffect, useState } from "react"
import { AuthChangeEvent, Session } from "@supabase/supabase-js"

const authBtnBase =
  "h-10 min-w-[6rem] rounded-full px-5 text-[0.9375rem] font-semibold tracking-tight shadow-sm transition-all duration-200 hover:!opacity-100 sm:min-w-[6.5rem]"

export function NavButtons() {
  const [session, setSession] = useState<boolean>(false)
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setSession(!!user)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, authSession: Session | null) => {
        setSession(!!authSession?.user)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
      {session ? (
        <>
          <Button asChild size="sm" className={cnAuthPrimary()}>
            <Link href="/wallet">Wallet</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cnAuthOutline()}
            onClick={handleLogout}
          >
            Log out
          </Button>
        </>
      ) : (
        <>
          <Button asChild size="sm" variant="outline" className={cnAuthOutline()}>
            <Link href="/auth">Log in</Link>
          </Button>
          <Button asChild size="sm" className={cnAuthPrimary()}>
            <Link href="/auth?tab=register">Register</Link>
          </Button>
        </>
      )}
    </div>
  )
}

function cnAuthPrimary() {
  return cn(
    authBtnBase,
    "border border-[color-mix(in_srgb,var(--color-accent1)_25%,transparent)] bg-[var(--color-accent1)] text-white hover:bg-[color-mix(in_srgb,var(--color-accent1)_85%,black)] hover:shadow-md"
  )
}

function cnAuthOutline() {
  return cn(
    authBtnBase,
    "border border-[color-mix(in_srgb,var(--color-dark)_12%,transparent)] bg-white/95 text-[color-mix(in_srgb,var(--color-dark)_85%,black)] hover:border-[color-mix(in_srgb,var(--color-dark)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-dark)_3%,white)]"
  )
}
