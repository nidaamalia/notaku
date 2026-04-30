import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase: any = null;

// Initialize Supabase only if credentials are available
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Create a mock client for development
  console.warn('Supabase environment variables not found. Running in mock mode.');
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: new Error('Mock mode - no auth') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: (query = '*') => ({
        eq: (field: string, value: any) => ({
          order: (column: string, options: any) => ({
            limit: (count: number) => Promise.resolve({ 
              data: [], 
              error: null 
            }),
            then: (resolve: any) => Promise.resolve({ 
              data: [], 
              error: null 
            })
          }),
          then: (resolve: any) => Promise.resolve({ 
            data: [], 
            error: null 
          })
        }),
        order: (column: string, options: any) => ({
          limit: (count: number) => Promise.resolve({ 
            data: [], 
            error: null 
          })
        }),
        then: (resolve: any) => Promise.resolve({ 
          data: [], 
          error: null 
        })
      }),
      insert: (data: any) => Promise.resolve({ 
        data: Array.isArray(data) ? data.map(item => ({ ...item, id: 'mock-id-' + Math.random() })) : { ...data, id: 'mock-id-' + Math.random() }, 
        error: null 
      }),
      update: (data: any) => Promise.resolve({ data: null, error: new Error('Mock mode - no database') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Mock mode - no database') })
    })
  };
}

export { supabase };
