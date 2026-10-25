import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Desempenho por Turma' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Desempenho por Turma" fase="Fase F6" />;
}
