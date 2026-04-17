"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import type { LucideIcon } from "lucide-react"
import { Home, Cpu, Wallet, ShoppingCart, Sliders, Settings } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"

export type MainNavItem = {
  href: string
  title: string
  icon: LucideIcon
}

export function useMainNavMenu() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [agentsLinkText, setAgentsLinkText] = useState("AI Agents")
  const supabase = createClient()
  const { tableExists } = useTheme()

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      if (!user) {
        setIsAdmin(false)
        return
      }
      const { data: userData } = await supabase
        .from("user_data")
        .select("user_role")
        .eq("UID", user.id)
        .single()
      setIsAdmin(userData?.user_role === "admin")
    }

    const checkWebsiteOptions = async () => {
      if (!tableExists) {
        return
      }
      try {
        const { data: websiteSettings, error } = await supabase
          .from("website_settings")
          .select("page_settings")
          .single()

        if (error && error.code === "PGRST116") {
          return
        }
        if (websiteSettings?.page_settings) {
          const ps = websiteSettings.page_settings as {
            agents?: { link_text?: string }
          }
          setAgentsLinkText(ps.agents?.link_text || "AI Agents")
        }
      } catch {
        /* ignore */
      }
    }

    fetchUserData()
    checkWebsiteOptions()
  }, [supabase, tableExists])

  const menuItems = useMemo<MainNavItem[]>(
    () => [
      { href: "/", title: "Home", icon: Home },
      { href: "/wallet", title: "Wallet", icon: Wallet },
      { href: "/buy-token", title: "Buy Beato Coin", icon: ShoppingCart },
      ...(isLoggedIn
        ? [{ href: "/redeem-token", title: "Redeem Beato Coin", icon: ShoppingCart }]
        : []),
      ...(isAdmin
        ? [{ href: "/admin-settings", title: "Website Settings", icon: Sliders }]
        : []),
      { href: "/contact", title: "Contact Us", icon: Settings },
    ],
    [isAdmin, isLoggedIn]
  )

  return { menuItems, isLoggedIn }
}
