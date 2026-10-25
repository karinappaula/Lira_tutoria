import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/layout/AuthShell';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Entrar' };

export default function PaginaLogin() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
