"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, LayoutDashboard, Settings, Sliders, CreditCard, PlusCircle, Package, Upload, Tags, Key, DollarSign, Users, ChevronLeft, ChevronRight, Cpu, ChevronDown, UserCircle, Wallet, ShoppingCart } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"
import { useSidebar } from "@/contexts/SidebarContext"
import Link from "next/link"
import { getPageSettings } from "@/utils/page-settings"

// Simple type assertion to fix build issues with Next.js 15.2.1
const LinkComponent = Link as any

export function Sidebar() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasWebsiteOptions, setHasWebsiteOptions] = useState(false)
  const [hasValidStripeConfig, setHasValidStripeConfig] = useState(false)
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false)
  const [isAgentsSubmenuOpen, setIsAgentsSubmenuOpen] = useState(false)
  const [agentsLinkText, setAgentsLinkText] = useState("AI Agents")
  const [pricingLinkText, setPricingLinkText] = useState("Plans & Pricing")
  const pathname = usePathname()
  const supabase = createClient()
  const { colors, tableExists } = useTheme()
  const { isCollapsed, setIsCollapsed } = useSidebar()

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: userData, error } = await supabase
          .from('user_data')
          .select('user_role')
          .eq('UID', user.id)
          .single()
        
        setIsLoggedIn(!!user)
        
        setIsAdmin(userData?.user_role === 'admin')
      }
    }

    const checkWebsiteOptions = async () => {
      // Skip the check if we already know the table doesn't exist
      if (!tableExists) {
        setHasWebsiteOptions(false)
        setHasValidStripeConfig(false)
        return
      }
      
      try {
        // Get all website settings in a single call
        const { data: websiteSettings, error } = await supabase
          .from('website_settings')
          .select('stripe_publishable_key, stripe_secret_key, stripe_webhook_secret, page_settings')
          .single()

        if (error && error.code === 'PGRST116') {
          // Table doesn't exist
          setHasWebsiteOptions(false)
          return
        }

        setHasWebsiteOptions(true)

        // Check Stripe configuration
        const hasStripeConfig = websiteSettings?.stripe_publishable_key && 
                              websiteSettings?.stripe_secret_key && 
                              websiteSettings?.stripe_webhook_secret
        setHasValidStripeConfig(!!hasStripeConfig)

        // Update page settings from the database
        if (websiteSettings?.page_settings) {
          setAgentsLinkText(websiteSettings.page_settings.agents?.link_text || "AI Agents")
          setPricingLinkText(websiteSettings.page_settings.pricing?.link_text || "Plans & Pricing")
        }

      } catch (error) {
        console.error('Error checking website options:', error)
        setHasWebsiteOptions(false)
        setHasValidStripeConfig(false)
      }
    }

    fetchUserData()
    checkWebsiteOptions()
  }, [supabase, tableExists])

  const menuItems = [
    {
      href: "/",
      title: "Home",
      icon: Home
    },
    {
      href: "/pricing",
      title: pricingLinkText,
      icon: Tags
    },
    {
      href: "/agents",
      title: agentsLinkText,
      icon: Cpu
    },
    {
      href: "/wallet",
      title: "Wallet",
      icon: Wallet
    },
    {
      href: "https://www.aquabeato.shop/pre-buy/",
      title: "Buy Beato Coin",
      icon: ShoppingCart
    },
    // Show Website Setup at the top level
    ...(
      !tableExists
        ? [{
            href: "/website-setup",
            title: "Website Setup",
            icon: Settings,
            highlight: true
          }]
        : (isAdmin
            ? [{
                href: "/website-setup",
                title: "Website Setup",
                icon: Settings
              }]
            : [])
      ),
    ...(isLoggedIn ? [{
      href: "/dashboard",
      title: "Dashboard",
      icon: LayoutDashboard
    },
    {
      href: "/user-settings",
      title: "User Settings",
      icon: Settings
    },
    {
      href: "/affiliate-dashboard",
      title: "Affiliate Program",
      icon: DollarSign
    },
    {
      href: "/billing",
      title: "Billing",
      icon: CreditCard
    }] : []),
    // Show admin-only menu items if user is admin
    ...(isAdmin ? [
      {
        href: "/admin-settings",
        title: "Website Settings",
        icon: Sliders
      },
      {
        type: "submenu",
        title: "My Agents",
        icon: Cpu,
        items: [
          {
            href: "/my-agents",
            title: "My Agents",
            icon: UserCircle
          },
          {
            href: "/create-agent",
            title: "Create Agent",
            icon: PlusCircle
          }
        ]
      },
      ...(hasValidStripeConfig ? [
        {
          type: "submenu",
          title: "Subscriptions",
          icon: CreditCard,
          items: [
            {
              href: "/subscriptions",
              title: "View All",
              icon: CreditCard
            },
            {
              href: "/products",
              title: "Products",
              icon: Package
            },
            {
              href: "/create-product-stripe",
              title: "Create Product",
              icon: PlusCircle
            },
            {
              href: "/affiliate-transactions",
              title: "Affiliate Manager",
              icon: Users
            }
          ]
        }
      ] : []),
    ] : []),
  ]

  const renderMenuItem = (item: any) => {
    if (item.type === "submenu") {
      // Check if this is the Agents submenu
      const isAgentsMenu = item.title === "Agents";
      const isSubmenuCurrentlyOpen = isAgentsMenu ? isAgentsSubmenuOpen : isSubmenuOpen;
      const toggleSubmenu = isAgentsMenu 
        ? () => setIsAgentsSubmenuOpen(!isAgentsSubmenuOpen) 
        : () => setIsSubmenuOpen(!isSubmenuOpen);

      return (
        <div key={item.title} className="space-y-1">
          <button
            onClick={toggleSubmenu}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all text-white",
              isSubmenuCurrentlyOpen
                ? "bg-[var(--color-accent1)] text-white"
                : "hover:bg-[var(--color-accent1)] hover:text-white",
              isCollapsed ? "justify-center" : "justify-start"
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span>{item.title}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform ml-auto", isSubmenuCurrentlyOpen ? "transform rotate-180" : "")} />
              </>
            )}
          </button>
          {!isCollapsed && isSubmenuCurrentlyOpen && (
            <div className="pl-4 space-y-1">
              {item.items.map((subItem: any) => (
                <LinkComponent
                  key={subItem.href}
                  href={subItem.href}
                  onClick={() => {
                    // Close sidebar on mobile when link is clicked
                    if (window.innerWidth < 768 && !isCollapsed) {
                      setIsCollapsed(true);
                      localStorage.setItem('sidebarCollapsed', 'true');
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all text-white",
                    pathname === subItem.href 
                      ? "bg-[var(--color-accent1)] text-white" 
                      : "hover:bg-[var(--color-accent1)] hover:text-white"
                  )}
                >
                  <subItem.icon className="h-4 w-4 flex-shrink-0" />
                  {subItem.title}
                </LinkComponent>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <LinkComponent
        key={item.href}
        href={item.href}
        onClick={() => {
          // Close sidebar on mobile when link is clicked
          if (window.innerWidth < 768 && !isCollapsed) {
            setIsCollapsed(true);
            localStorage.setItem('sidebarCollapsed', 'true');
          }
        }}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all text-white",
          pathname === item.href 
            ? "bg-[var(--color-accent1)] text-white" 
            : "hover:bg-[var(--color-accent1)] hover:text-white",
          // Only show highlight when table doesn't exist AND item is marked for highlighting
          item.highlight && !tableExists 
            ? "border border-yellow-400 bg-opacity-20 bg-yellow-500" 
            : "",
          isCollapsed ? "justify-center" : "justify-start"
        )}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && item.title}
      </LinkComponent>
    )
  }

  return (
    <div 
      className={cn(
        "bg-[var(--color-dark)] transition-all duration-300 min-h-screen",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex justify-center py-5">
        <button
          onClick={() => {
            const newState = !isCollapsed;
            setIsCollapsed(newState);
            // Save user preference
            localStorage.setItem('sidebarCollapsed', newState.toString());
          }}
          className="rounded-full p-2 text-white flex items-center justify-center"
          style={{ backgroundColor: colors.accent1 }}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav className="space-y-2 px-3">
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>
    </div>
  )
} 