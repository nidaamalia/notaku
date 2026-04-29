'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

const PUBLIC_ROUTES = ['/login'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setProfile } = useAppStore();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check if route is public
      if (PUBLIC_ROUTES.includes(pathname)) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // No session, redirect to login
          setIsLoading(false);
          window.location.href = '/login';
          return;
        }

        // Set user in store
        setUser(user);

        // Get profile - handle case where profile might not exist yet
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.log('Profile not found, creating default profile...');
          // Create default profile if not exists
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              family_name: 'Keluarga',
              monthly_income: 0,
              saving_target_pct: 20
            })
            .select('*')
            .single();
          
          if (createError) {
            console.error('Error creating profile:', createError);
            // Still set user even if profile creation fails
            setIsLoading(false);
            return;
          }
          
          if (newProfile) {
            setProfile(newProfile);
          }
        } else if (profile) {
          setProfile(profile);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setIsLoading(false);
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        if (!PUBLIC_ROUTES.includes(pathname)) {
          window.location.href = '/login';
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        
        // Load profile for newly signed in user
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          // Create default profile
          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              family_name: 'Keluarga',
              monthly_income: 0,
              saving_target_pct: 20
            })
            .select('*')
            .single();
          
          if (newProfile) {
            setProfile(newProfile);
          }
        } else if (profile) {
          setProfile(profile);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, setUser, setProfile]);

  // Show loading for non-public routes while checking auth
  if (!PUBLIC_ROUTES.includes(pathname) && (isLoading || !user)) {
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
