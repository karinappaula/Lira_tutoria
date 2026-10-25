import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Turmas' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Turmas" fase="Fase F4" />;
}
