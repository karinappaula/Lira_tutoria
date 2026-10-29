import type { Metadata } from 'next';
import { CorrecoesAdmin } from './CorrecoesAdmin';

export const metadata: Metadata = {
  title: 'Revisão de Correções · LIRA',
  description: 'Fila de revisão e controle de qualidade pedagógica das correções de redações avaliativas.',
};

export default function PaginaCorrecoesAdmin() {
  return <CorrecoesAdmin />;
}
