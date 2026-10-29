import type { Metadata } from 'next';
import { ComunicadosAdmin } from './ComunicadosAdmin';

export const metadata: Metadata = {
  title: 'Comunicados Institucionais - LIRA Tutoria',
  description: 'Gestão e envio de avisos e comunicados institucionais aos tutores.',
};

export default function PaginaComunicadosAdmin() {
  return <ComunicadosAdmin />;
}
