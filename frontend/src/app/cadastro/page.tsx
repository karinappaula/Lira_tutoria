import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/layout/AuthShell';
import { CadastroForm } from './CadastroForm';

export const metadata: Metadata = { title: 'Criar conta' };

export default function PaginaCadastro() {
  return (
    <AuthShell>
      <Suspense>
        <CadastroForm />
      </Suspense>
    </AuthShell>
  );
}