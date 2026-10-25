import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Fila de correção' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Fila de correção" fase="Fase F3" />;
}
