import '@/styles/globals.scss';
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata = {
  title: 'LIRA Tutoria',
  description: 'Plataforma web de tutoria de redações e preparação para vestibulares',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}