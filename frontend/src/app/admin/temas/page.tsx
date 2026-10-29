import type { Metadata } from 'next';
import { TemasAdmin } from './TemasAdmin';

export const metadata: Metadata = {
  title: 'Banco de Temas - LIRA Administração',
  description: 'Gerencie temas oficiais e acompanhe propostas cadastradas na plataforma.',
};

export default function PaginaTemasAdmin() {
  return <TemasAdmin />;
}
