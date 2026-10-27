import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TelaDeCorrecao } from '../../components/TelaDeCorrecao';

export const metadata: Metadata = { title: 'Corrigir redação' };

export default async function PaginaCorrecao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  return <TelaDeCorrecao id={numero} />;
}