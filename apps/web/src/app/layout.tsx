import type { Metadata } from 'next';
import { Space_Mono } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'zkKYC — Privacy-First Compliance on Stellar',
  description:
    'Prove who you are. Reveal nothing else. Zero-knowledge identity verification on Stellar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: '#000000' }}>
      <body className={spaceMono.variable} style={{ background: '#000000', minHeight: '100vh' }}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
