import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Meus alunos' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Meus alunos" fase="Fase F3" />;
}
