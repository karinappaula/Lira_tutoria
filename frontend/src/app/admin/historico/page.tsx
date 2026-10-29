import type { Metadata } from 'next';
import { HistoricoAdmin } from './HistoricoAdmin';

export const metadata: Metadata = {
  title: 'Histórico Geral de Correções · LIRA',
  description: 'Auditoria e consulta geral de todas as redações corrigidas no sistema.',
};

export default function PaginaHistoricoAdmin() {
  return <HistoricoAdmin />;
}
