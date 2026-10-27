import type { Metadata } from 'next';
import { TarefasDoTutor } from '../components/TarefasDoTutor';

export const metadata: Metadata = { title: 'Tarefas' };

export default function PaginaTarefas() {
  return <TarefasDoTutor />;
}