import type { Metadata } from 'next';
import { CadernoErrosAluno } from './CadernoErrosAluno';

export const metadata: Metadata = {
  title: 'Caderno de Erros - LIRA Tutoria',
  description: 'Revise suas questões erradas em simulados, pratique com novos simulados de revisão e consulte resoluções comentadas.',
};

export default function PaginaCadernoErrosAluno() {
  return <CadernoErrosAluno />;
}
