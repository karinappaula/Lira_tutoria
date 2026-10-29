import type { Metadata } from 'next';
import { TarefasAdmin } from './TarefasAdmin';

export const metadata: Metadata = {
  title: 'Tarefas Gerais (Modelos) - LIRA Administração',
  description: 'Cadastre e gerencie modelos de atividades de redação e acompanhe as replicações por turmas.',
};

export default function PaginaTarefasAdmin() {
  return <TarefasAdmin />;
}
