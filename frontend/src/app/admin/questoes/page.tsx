import type { Metadata } from 'next';
import { BancoQuestoesAdmin } from './BancoQuestoesAdmin';

export const metadata: Metadata = {
  title: 'Banco de Questões - LIRA Administração',
  description: 'Gerencie o acervo de questões de vestibulares, alternativas e taxonomia temática.',
};

export default function PaginaQuestoesAdmin() {
  return <BancoQuestoesAdmin />;
}
