import type { Metadata } from 'next';
import { PaginaEmConstrucao } from '@/components/layout/PaginaEmConstrucao';

export const metadata: Metadata = { title: 'Tarefas' };

export default function Pagina() {
  return <PaginaEmConstrucao titulo="Tarefas" fase="Fase F3" />;
}
