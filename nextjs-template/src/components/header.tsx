'use client'

import { NavButtons } from "@/components/nav-buttons"
import { MobileMenu } from "@/components/mobile-menu"
import { MainNavLinks } from "@/components/main-nav-links"
import { useMainNavMenu } from "@/hooks/use-main-nav-menu"
import Image from "next/image"
import Link from "next/link"

export function Header() {
  const { menuItems } = useMainNavMenu()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[color-mix(in_srgb,var(--color-dark)_8%,transparent)] bg-[color-mix(in_srgb,white_96%,var(--color-secondary))] shadow-sm backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[color-mix(in_srgb,white_85%,var(--color-secondary))]">
      <div className="mx-auto flex h-[4rem] max-w-[1400px] items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center">
          <Link href="/" className="rounded-md outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">
            <Image
              src="/logo.png"
              alt="Beato Coin"
              width={160}
              height={60}
              className="h-10 w-auto sm:h-12"
              priority
            />
          </Link>
        </div>

        <nav
          aria-label="Main navigation"
          className="hidden min-w-0 flex-1 lg:flex lg:justify-center lg:px-8"
        >
          <MainNavLinks items={menuItems} />
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden lg:block">
            <NavButtons />
          </div>
          <div className="lg:hidden">
            <MobileMenu navItems={menuItems} />
          </div>
        </div>
      </div>
    </header>
  )
}
