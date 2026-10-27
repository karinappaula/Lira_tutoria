import { api } from '@/lib/http';
import type { CorrecaoDaVersao, ConviteCriado, ItemDaFila, ItemDoHistorico, NovaCorrecao, TarefaDoTutor, Tutorado } from '@/types/correcoes';
import type { VersaoRedacao } from '@/types/redacoes';

export interface DadosDeTarefa {
  tituloTarefa: string;
  descricao?: string;
  prazoEntrega: string;
  idTema?: number;
  novoTema?: { tituloTema: string; textoMotivador?: string };
}

export const tutorService = {
  fila: (signal?: AbortSignal) => api.get<ItemDaFila[]>('redacoes/aguardando-correcao', undefined, signal),
  corrigir: (dados: NovaCorrecao) => api.post<CorrecaoDaVersao>('redacoes/correcoes', dados),
  solicitarReescrita: (idRedacao: number) => api.post<VersaoRedacao>(`redacoes/${idRedacao}/solicitar-reescrita`),

  tutorados: (busca?: string, signal?: AbortSignal) => api.get<Tutorado[]>('indicadores/tutor/alunos', { busca }, signal),
  historico: (mes?: string, signal?: AbortSignal) => api.get<ItemDoHistorico[]>('indicadores/historico-correcoes', { mes }, signal),
  convidarAluno: () => api.post<ConviteCriado>('tutor/convites/aluno'),

  tarefas: (signal?: AbortSignal) => api.get<TarefaDoTutor[]>('tarefas', undefined, signal),
  criarTarefa: (dados: DadosDeTarefa) => api.post<TarefaDoTutor>('tarefas', dados),
  alterarPrazo: (id: number, prazoEntrega: string) => api.patch<TarefaDoTutor>(`tarefas/${id}`, { prazoEntrega }),
  excluirTarefa: (id: number) => api.delete<void>(`tarefas/${id}`),
  aplicarAtividadeGeral: (id: number, prazoEntrega: string) => api.post<TarefaDoTutor>(`tarefas/${id}/replicar`, { prazoEntrega }),
};

/** Avisa o menu do Tutor que a fila de correção mudou (para atualizar o número ao lado de "Fila de correção"). */
export const EVENTO_FILA_MUDOU = 'lira:fila-mudou';
export const avisarFilaMudou = () => window.dispatchEvent(new Event(EVENTO_FILA_MUDOU));