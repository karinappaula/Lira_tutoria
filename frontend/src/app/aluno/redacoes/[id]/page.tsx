import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DetalheRedacao } from '../components/DetalheRedacao';

export const metadata: Metadata = { title: 'Redação' };

export default async function PaginaRedacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  return <DetalheRedacao id={numero} />;
}