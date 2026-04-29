import { Toaster } from 'sonner';
import AuthProvider from '@/components/AuthProvider';
import AppLayout from '@/components/layout/AppLayout';
import "./globals.css";

export const metadata = {
  title: 'Notaku AI - Kelola Pengeluaran dengan AI',
  description: 'Aplikasi manajemen pengeluaran dengan AI assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="font-sans antialiased">
        <AuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
