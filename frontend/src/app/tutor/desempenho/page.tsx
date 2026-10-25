import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Desempenho em Redações' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Desempenho em Redações" fase="Fase F6" />;
}
