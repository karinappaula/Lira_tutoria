import type { Metadata } from 'next';
import { TemasTutor } from './TemasTutor';

export const metadata: Metadata = {
  title: 'Banco de Temas - LIRA Tutor',
  description: 'Gerencie temas de redação e consulte os temas oficiais disponíveis.',
};

export default function PaginaTemasTutor() {
  return <TemasTutor />;
}
