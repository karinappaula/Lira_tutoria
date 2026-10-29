import type { Metadata } from 'next';
import { TurmasAdmin } from './TurmasAdmin';

export const metadata: Metadata = {
  title: 'Gestão de Turmas · LIRA',
  description: 'Gestão de turmas, vagas de tutores, remanejamentos e emissão de convites parametrizados.',
};

export default function PaginaTurmasAdmin() {
  return <TurmasAdmin />;
}
