import type { Metadata } from 'next';
import { DesempenhoAdmin } from './DesempenhoAdmin';

export const metadata: Metadata = {
  title: 'Desempenho por Turma e Tutor - LIRA Tutoria',
  description: 'Painel analítico e indicadores consolidados de turmas, competências e tutores.',
};

export default function PaginaDesempenhoAdmin() {
  return <DesempenhoAdmin />;
}
