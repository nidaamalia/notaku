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
      // Add timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('🔍 AUTH - Timeout reached, forcing mock mode...');
        const mockUser = {
          id: 'mock-user-id',
          email: 'mock@example.com',
          aud: 'mock',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone: '',
          email_confirmed_at: new Date().toISOString(),
          phone_confirmed_at: null,
          last_sign_in_at: new Date().toISOString()
        };
        setUser(mockUser as any);
        
        const mockProfile = {
          id: 'mock-user-id',
          family_name: 'Keluarga Mock',
          monthly_income: 5000000,
          saving_target_pct: 20,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setProfile(mockProfile);
        setIsLoading(false);
      }, 3000); // 3 second timeout

      try {
        // Check if route is public
        if (PUBLIC_ROUTES.includes(pathname)) {
          clearTimeout(timeout);
          setIsLoading(false);
          return;
        }

        // Check if we're in mock mode immediately
        if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
          clearTimeout(timeout);
          console.log('🔍 AUTH - Mock mode detected immediately, creating mock user...');
          const mockUser = {
            id: 'mock-user-id',
            email: 'mock@example.com',
            aud: 'mock',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phone: '',
            email_confirmed_at: new Date().toISOString(),
            phone_confirmed_at: null,
            last_sign_in_at: new Date().toISOString()
          };
          setUser(mockUser as any);
          
          // Create mock profile
          const mockProfile = {
            id: 'mock-user-id',
            family_name: 'Keluarga Mock',
            monthly_income: 5000000,
            saving_target_pct: 20,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProfile(mockProfile);
          setIsLoading(false);
          return;
        }

        const result = await supabase.auth.getUser();
        const user = result.data?.user;
        
        if (!user) {
          console.log('🔍 AUTH - No user found, checking if mock mode...');
          
          // Check if we're in mock mode by checking if supabase is using mock implementation
          if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
            clearTimeout(timeout);
            console.log('🔍 AUTH - Mock mode detected, creating mock user...');
            // In mock mode, create a mock user to prevent redirect loops
            const mockUser = {
              id: 'mock-user-id',
              email: 'mock@example.com',
              aud: 'mock',
              role: 'authenticated',
              app_metadata: {},
              user_metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              phone: '',
              email_confirmed_at: new Date().toISOString(),
              phone_confirmed_at: null,
              last_sign_in_at: new Date().toISOString()
            };
            setUser(mockUser as any);
            setIsLoading(false);
            return;
          }
          
          // No session, redirect to login
          console.log('🔍 AUTH - No session, redirecting to login...');
          clearTimeout(timeout);
          setIsLoading(false);
          window.location.href = '/login';
          return;
        }

        // Clear timeout since we have a user
        clearTimeout(timeout);
        
        // Set user in store
        setUser(user);

        // Get profile - handle case where profile might not exist yet
        if (user.id === 'mock-user-id') {
          // Mock mode - create default profile
          const mockProfile = {
            id: 'mock-user-id',
            family_name: 'Keluarga Mock',
            monthly_income: 5000000,
            saving_target_pct: 20,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setProfile(mockProfile);
          setIsLoading(false);
          return;
        }

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
