import type { Metadata } from 'next';
import { DesempenhoTutor } from './DesempenhoTutor';

export const metadata: Metadata = {
  title: 'Desempenho dos Tutorados - LIRA Tutoria',
  description: 'Acompanhamento do rendimento em redações e simulados dos alunos sob sua tutoria.',
};

export default function PaginaDesempenhoTutor() {
  return <DesempenhoTutor />;
}
