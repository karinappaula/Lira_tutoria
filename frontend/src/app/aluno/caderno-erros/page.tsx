import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Caderno de erros' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Caderno de erros" fase="Fase F5" />;
}
