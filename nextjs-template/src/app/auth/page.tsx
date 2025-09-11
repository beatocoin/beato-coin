"use client"

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation'
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AuthPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const tab = searchParams?.get('tab')
  const view = tab === 'register' ? 'sign_up' : 'sign_in'
  const { colors } = useTheme()

  return (
    <div className="container mx-auto max-w-[400px] mt-14 px-4">
      <Auth
        supabaseClient={supabase}
        view={view}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: colors.accent1,
                brandAccent: colors.accent1,
                brandButtonText: '#fff',
              },
            },
          },
        }}
        theme="dark"
        showLinks={true}
        providers={['google']}
        redirectTo={`${window.location.origin}/wallet`}
      />
      {tab !== 'register' && (
        <Link href="/auth?tab=register">
          <Button
            style={{ backgroundColor: colors.accent2, color: '#fff', marginTop: 24, width: '100%' }}
            className="font-semibold text-base"
          >
            Create an Account
          </Button>
        </Link>
      )}
    </div>
  )
} 