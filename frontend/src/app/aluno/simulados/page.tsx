import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Simulados' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Simulados" fase="Fase F5" />;
}
