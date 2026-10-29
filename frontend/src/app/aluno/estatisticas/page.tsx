import type { Metadata } from 'next';
import { EstatisticasAluno } from './EstatisticasAluno';

export const metadata: Metadata = {
  title: 'Minhas Estatísticas - LIRA Tutoria',
  description: 'Acompanhe suas notas por competência do ENEM, histórico de redações e taxa de acertos em simulados.',
};

export default function PaginaEstatisticasAluno() {
  return <EstatisticasAluno />;
}
