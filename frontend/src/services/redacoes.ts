import { api } from '@/lib/http';
import type { RedacaoDetalhada } from '@/types/correcoes';
import type { NovaRedacao, Redacao, TarefaDoAluno, VersaoRedacao } from '@/types/redacoes';

export const redacoesService = {
  listar: (signal?: AbortSignal) => api.get<Redacao[]>('redacoes', undefined, signal),
  /** Detalhe com histórico completo: versões → correções → marcações. */
  obter: (id: number, signal?: AbortSignal) => api.get<RedacaoDetalhada>(`redacoes/${id}`, undefined, signal),
  criar: (dados: NovaRedacao) => api.post<Redacao>('redacoes', dados),
  /** Devolve a versão atualizada (não a redação inteira). */
  salvarRascunho: (id: number, conteudoTexto: string) => api.patch<VersaoRedacao>(`redacoes/${id}/rascunho`, { conteudoTexto }),
  /** Devolve a versão enviada. Bloqueia novas alterações. */
  enviar: (id: number) => api.post<VersaoRedacao>(`redacoes/${id}/enviar`),
  /** Cria a reescrita (versão 2). Só depois que o Tutor solicitou e só uma vez. */
  reescrever: (id: number) => api.post<VersaoRedacao>(`redacoes/${id}/reescrita`),
  /** Só funciona para redação com uma única versão em rascunho. */
  excluir: (id: number) => api.delete<void>(`redacoes/${id}`),
};

export { temasService, type DadosDeTema } from './temas';

export const tarefasService = {
  /** Visão do aluno: tarefas avaliativas do seu Tutor, com o id da redação já iniciada (ou null). */
  listarDoAluno: (signal?: AbortSignal) => api.get<TarefaDoAluno[]>('tarefas', undefined, signal),
};
