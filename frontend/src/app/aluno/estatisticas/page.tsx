import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Estatísticas' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Estatísticas" fase="Fase F6" />;
}
