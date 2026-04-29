'use client';

import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: LayoutProps) {
  const { user } = useAppStore();
  const pathname = usePathname();

  if (!user) {
    return <>{children}</>;
  }

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: FileText, label: 'Riwayat', path: '/history' },
    { icon: PlusCircle, label: 'Tambah', path: '/add', addBtn: true },
    { icon: Search, label: 'Cari', path: '/search' },
    { icon: Settings, label: 'Profil', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col m-0 p-0">
      <main className="flex-1 pb-20 w-full max-w-lg mx-auto bg-background">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
        <div className="max-w-lg mx-auto flex justify-between items-center px-4 h-16">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => window.location.href = item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                pathname === item.path ? "text-primary" : "text-plum-muted"
              )}
            >
              {item.addBtn ? (
                <div className="bg-primary text-white p-3 rounded-full -mt-6 shadow-lg border-4 border-white">
                  <item.icon size={24} />
                </div>
              ) : (
                <>
                  <item.icon size={20} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
