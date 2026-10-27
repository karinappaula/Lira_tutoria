import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DetalheDoTutor } from '../../components/DetalheDoTutor';

export const metadata: Metadata = { title: 'Redação do aluno' };

export default async function PaginaRedacaoDoTutor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  return <DetalheDoTutor id={numero} />;
}