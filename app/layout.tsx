import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import Providers from '@/components/Providers';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SACHHSOFT — Employee Portal',
  description: 'Official HR Management Portal for SACHHSOFT employees. Manage leaves, equipment, handbooks, and more.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/sachhsoft-favicon.png', type: 'image/png' },
    ],
    apple: '/sachhsoft-favicon.png',
  },
  openGraph: {
    title: 'SACHHSOFT — Employee Portal',
    description: 'Official HR Management Portal for SACHHSOFT employees.',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'SACHHSOFT Employee Portal' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SACHHSOFT — Employee Portal',
    description: 'Official HR Management Portal for SACHHSOFT employees.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>
          <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
