import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Histórico geral de correções' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Histórico geral de correções" fase="Fase F4" />;
}
