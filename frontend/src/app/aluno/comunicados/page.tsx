import type { Metadata } from 'next';
import { ComunicadosAluno } from './ComunicadosAluno';

export const metadata: Metadata = {
  title: 'Comunicados e Avisos - LIRA Tutoria',
  description: 'Caixa de entrada de avisos e comunicados pedagógicos do seu tutor.',
};

export default function PaginaComunicadosAluno() {
  return <ComunicadosAluno />;
}
