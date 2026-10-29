import type { Metadata } from 'next';
import { ComunicadosTutor } from './ComunicadosTutor';

export const metadata: Metadata = {
  title: 'Central de Comunicados - LIRA Tutoria',
  description: 'Caixa de entrada de avisos da administração e disparo de comunicados para seus tutorados.',
};

export default function PaginaComunicadosTutor() {
  return <ComunicadosTutor />;
}
