import type { Metadata } from 'next';
import { SimuladosAluno } from './SimuladosAluno';

export const metadata: Metadata = {
  title: 'Simulados - LIRA Tutoria',
  description: 'Gere simulados cronometrados, pratique com questões de vestibulares e veja seus gabaritos comentados.',
};

export default function PaginaSimuladosAluno() {
  return <SimuladosAluno />;
}
