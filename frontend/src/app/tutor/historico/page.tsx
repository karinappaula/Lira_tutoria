import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Histórico de correções' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Histórico de correções" fase="Fase F3" />;
}
