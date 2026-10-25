import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/layout/AuthShell';
import { RedefinirSenhaForm } from './RedefinirSenhaForm';

export const metadata: Metadata = { title: 'Redefinir senha' };

export default function PaginaRedefinirSenha() {
  return (
    <AuthShell>
      <Suspense>
        <RedefinirSenhaForm />
      </Suspense>
    </AuthShell>
  );
}