import type { Metadata } from 'next';
import { HistoricoDoTutor } from '../components/HistoricoDoTutor';

export const metadata: Metadata = { title: 'Histórico de correções' };

export default function PaginaHistorico() {
  return <HistoricoDoTutor />;
}