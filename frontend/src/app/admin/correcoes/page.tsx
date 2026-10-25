import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Correções pendentes de revisão' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Correções pendentes de revisão" fase="Fase F4" />;
}
