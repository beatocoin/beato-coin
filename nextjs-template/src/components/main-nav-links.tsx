"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { MainNavItem } from "@/hooks/use-main-nav-menu"

function navItemIsActive(pathname: string, href: string) {
  const base = href.split("?")[0] || href
  if (base === "/") return pathname === "/"
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function MainNavLinks({
  items,
  className,
  onNavigate,
  showIcons = false,
}: {
  items: MainNavItem[]
  className?: string
  onNavigate?: () => void
  /** Icons clutter the desktop bar; mobile menu keeps its own list with icons. */
  showIcons?: boolean
}) {
  const pathname = usePathname()

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:gap-x-4",
        className
      )}
    >
      {items.map((item) => {
        const active = navItemIsActive(pathname, item.href)
        const Icon = item.icon
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9375rem] font-semibold tracking-tight transition-all duration-200",
                active
                  ? "bg-[color-mix(in_srgb,var(--color-accent1)_8%,transparent)] text-[var(--color-accent1)]"
                  : "text-[color-mix(in_srgb,var(--color-dark)_85%,white)] hover:bg-[color-mix(in_srgb,var(--color-dark)_4%,transparent)] hover:text-[var(--color-dark)]"
              )}
            >
              {showIcons ? (
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              ) : null}
              <span className="whitespace-nowrap">{item.title}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
