import { api } from '@/lib/http';
import type { NovaRedacao, Redacao, Tema, TarefaDoAluno, VersaoRedacao } from '@/types/redacoes';

export const redacoesService = {
  listar: (signal?: AbortSignal) => api.get<Redacao[]>('redacoes', undefined, signal),
  obter: (id: number, signal?: AbortSignal) => api.get<Redacao>(`redacoes/${id}`, undefined, signal),
  criar: (dados: NovaRedacao) => api.post<Redacao>('redacoes', dados),
  /** Devolve a versão atualizada (não a redação inteira). */
  salvarRascunho: (id: number, conteudoTexto: string) => api.patch<VersaoRedacao>(`redacoes/${id}/rascunho`, { conteudoTexto }),
  /** Devolve a versão enviada. Bloqueia novas alterações. */
  enviar: (id: number) => api.post<VersaoRedacao>(`redacoes/${id}/enviar`),
  /** Só funciona para redação com uma única versão em rascunho. */
  excluir: (id: number) => api.delete<void>(`redacoes/${id}`),
};

export const temasService = {
  listar: (signal?: AbortSignal) => api.get<Tema[]>('temas', undefined, signal),
};

export const tarefasService = {
  /** Visão do aluno: tarefas avaliativas do seu Tutor, com o id da redação já iniciada (ou null). */
  listarDoAluno: (signal?: AbortSignal) => api.get<TarefaDoAluno[]>('tarefas', undefined, signal),
};