import { api } from '@/lib/http';
import type { Tema } from '@/types/redacoes';

export interface DadosDeTema {
  tituloTema: string;
  textoMotivador?: string;
  imagemUrl?: string;
  origem?: string;
}

export const temasService = {
  listar: (signal?: AbortSignal) => api.get<Tema[]>('temas', undefined, signal),
  obter: (id: number, signal?: AbortSignal) => api.get<Tema>(`temas/${id}`, undefined, signal),
  criar: (dados: DadosDeTema) => api.post<Tema>('temas', dados),
  atualizar: (id: number, dados: Partial<DadosDeTema>) => api.patch<Tema>(`temas/${id}`, dados),
  excluir: (id: number) => api.delete<void>(`temas/${id}`),
};
