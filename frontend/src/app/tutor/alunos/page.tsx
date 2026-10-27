import type { Metadata } from 'next';
import { MeusAlunos } from '../components/MeusAlunos';

export const metadata: Metadata = { title: 'Meus alunos' };

export default function PaginaAlunos() {
  return <MeusAlunos />;
}