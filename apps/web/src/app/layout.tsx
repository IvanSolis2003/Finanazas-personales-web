import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Iasmtech Finanzas',
  description: 'Control de gastos compartidos para parejas y grupos',
};

export const viewport: Viewport = {
  themeColor: '#1976D2',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
        <Script
          src="https://iasm-pulse.vercel.app/track.js"
          data-site="finanzas.iasmtech.com"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
