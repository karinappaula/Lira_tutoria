import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/rubik';
import '@/styles/globals.scss';
import { ToastProvider } from '@/components/ui/Toast/Toast';

export const metadata: Metadata = {
  title: { default: 'LIRA Tutoria', template: '%s · LIRA Tutoria' },
  description: 'Plataforma de tutoria de redações e preparação para vestibulares.',
  icons: { icon: '/pena-lira.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#006b70',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a href="#conteudo" className="pular-para-conteudo">
          Pular para o conteúdo
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
