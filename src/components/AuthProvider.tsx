'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';

const PUBLIC_ROUTES = ['/login'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setProfile } = useAppStore();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      // Check if route is public
      if (PUBLIC_ROUTES.includes(pathname)) {
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // No session, redirect to login
          window.location.href = '/login';
          return;
        }

        // Set user in store
        setUser(user);

        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setProfile(profile);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        window.location.href = '/login';
      }
    };

    initAuth();
  }, [pathname, setUser, setProfile]);

  // Show loading for non-public routes while checking auth
  if (!PUBLIC_ROUTES.includes(pathname) && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-plum-muted">Memproses autentikasi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
