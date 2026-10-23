import { fetchClient } from '@/lib/api';
import { Tarefa } from '@/types/api';

export async function listarTarefasAlunoApi(): Promise<Tarefa[]> {
  return fetchClient<Tarefa[]>('/tarefas');
}

export async function buscarTarefaPorIdApi(idTarefa: number): Promise<Tarefa> {
  return fetchClient<Tarefa>(`/tarefas/${idTarefa}`);
}