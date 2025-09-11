"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTheme } from "../contexts/ThemeContext";
import { MobileMenu } from "@/components/mobile-menu";
import { CustomNavButtons } from "@/components/custom-nav-buttons";
import Loading from "@/components/ui/loading";
import { getSiteName, DEFAULT_SITE_NAME, subscribeToSiteNameChanges } from "@/utils/site-name";
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function CustomHeader() {
  const [siteName, setSiteName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<boolean>(false);
  const supabase = createClient();
  const { colors } = useTheme();

  useEffect(() => {
    const loadSiteName = async () => {
      setIsLoading(true);
      const name = await getSiteName();
      setSiteName(name);
      setIsLoading(false);
    };
    
    // Load initial site name
    loadSiteName();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSiteNameChanges((newName) => {
      setSiteName(newName);
    });

    // Check auth session
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSession(!!user);
    };

    checkSession();

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setSession(!!session?.user);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      authSubscription.unsubscribe();
    };
  }, [supabase.auth]);

  return (
    <header className="w-full border-b">
      <div className="mx-auto px-4 h-[90px] flex items-center justify-between" style={{ maxWidth: '90%' }}>
        <div className="flex items-center h-full" style={{ flex: '0 0 auto' }}>
          <Link href="/" className="flex items-center h-full">
            <img src="/logo-header.png" alt="Logo" style={{ height: '45px', width: 'auto', display: 'block', maxWidth: '100%', maxHeight: '100%' }} />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <CustomNavButtons />
          {/* Show MobileMenu for all users on mobile, with different links for logged in/out */}
          <div className="md:hidden flex items-center">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
} 