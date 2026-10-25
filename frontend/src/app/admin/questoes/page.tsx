import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Banco de Questões' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Banco de Questões" fase="Fase F5" />;
}
