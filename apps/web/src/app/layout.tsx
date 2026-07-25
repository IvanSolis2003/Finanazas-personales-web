import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'GrupoFinanzas',
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
      </body>
    </html>
  );
}
