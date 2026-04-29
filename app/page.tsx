'use client';

import { useAppStore } from '@/stores/useAppStore';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { user, profile } = useAppStore();

  // User should already be authenticated at this point (from layout.tsx)
  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-plum-muted">Memuat profil...</p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
