import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NOMES_DE_COOKIE, ehPapel } from '@/lib/papeis';
import type { PapelUsuario } from '@/types/api';
import { EscolhaDePapel } from './EscolhaDePapel';

export const metadata: Metadata = { title: 'Escolher área' };

function lerPapeis(bruto: string | undefined): PapelUsuario[] {
  if (!bruto) return [];
  try {
    const dados: unknown = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter(ehPapel) : [];
  } catch {
    return [];
  }
}

export default async function PaginaEscolherPapel() {
  const papeis = lerPapeis((await cookies()).get(NOMES_DE_COOKIE.pendentePapeis)?.value);
  if (papeis.length === 0) redirect('/login');
  return <EscolhaDePapel papeis={papeis} />;
}
