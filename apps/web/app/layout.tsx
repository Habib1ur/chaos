import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { MobileBottomNav, Navbar } from '@/components/layout/Navbar';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CHAOS — Friends. Games. Secrets. Absolute Chaos.',
  description:
    'All-in-one online multiplayer social party gaming platform. Create a room, invite friends, and play Truth or Dare, King’s Game, Who Said That, and more in real time.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans pb-20 md:pb-0">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
