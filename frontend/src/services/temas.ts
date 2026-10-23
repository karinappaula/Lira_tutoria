import { fetchClient } from '@/lib/api';
import { Tema } from '@/types/api';

export async function listarTemasApi(): Promise<Tema[]> {
  return fetchClient<Tema[]>('/temas');
}

export async function buscarTemaPorIdApi(idTema: number): Promise<Tema> {
  return fetchClient<Tema>(`/temas/${idTema}`);
}