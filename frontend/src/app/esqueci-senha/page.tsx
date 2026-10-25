import type { Metadata } from 'next';
import { AuthShell } from '@/components/layout/AuthShell';
import { EsqueciSenhaForm } from './EsqueciSenhaForm';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function PaginaEsqueciSenha() {
  return (
    <AuthShell>
      <EsqueciSenhaForm />
    </AuthShell>
  );
}