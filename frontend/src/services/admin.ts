import { api } from '@/lib/http';
import type { ConviteCriado, ItemDoHistorico, TarefaDoTutor } from '@/types/correcoes';
import type { AnexoCriado, DadosDeAnexo, DadosDeTarefa } from './tutor';

export interface TurmaAdmin {
  id: number;
  nome: string;
  anoLetivo: number;
  vestibularFoco: string;
  status: 'ATIVA' | 'ARQUIVADA' | 'INATIVA';
  criadoEm: string;
  totalTutores: number;
  totalAlunos: number;
}

export interface AlunoDaTurma {
  idUsuario: number;
  idTutor: number;
  usuario: { id: number; nome: string; email: string; status: string };
}

export interface TutorDaTurma {
  idUsuario: number;
  idTurma: number;
  usuario: { id: number; nome: string; email: string; status: string };
  alunos: AlunoDaTurma[];
}

export interface TurmaDetalhada {
  id: number;
  nome: string;
  anoLetivo: number;
  vestibularFoco: string;
  status: 'ATIVA' | 'ARQUIVADA' | 'INATIVA';
  criadoEm: string;
  tutores: TutorDaTurma[];
  _count?: { tarefas: number; convites: number };
}

export interface NovaTurmaInput {
  nome: string;
  anoLetivo: number;
  vestibularFoco?: string;
}

export interface ConviteAdminItem {
  codigo: string;
  papel: string;
  turma: { id: number; nome: string; anoLetivo: number };
  tutor: { idUsuario: number; nome: string; email: string } | null;
  usado: boolean;
  usosAtuais: number;
  usosMaximos: number;
  vagasRestantes: number;
  ativo: boolean;
  expiraEm: string;
  criadoEm: string;
}

export interface UsuarioTutorItem {
  id: number;
  nome: string;
  email: string;
  status: string;
  tutor?: {
    idTurma: number;
    turma?: { id: number; nome: string };
    _count?: { alunos: number };
  };
}

export interface CorrecaoPendenteItem {
  id: number;
  idVersao: number;
  idTutor: number;
  numeroAjuste: number;
  notaComp1: string | number | null;
  notaComp2: string | number | null;
  notaComp3: string | number | null;
  notaComp4: string | number | null;
  notaComp5: string | number | null;
  notaTotal: string | number | null;
  comentarioComp1: string | null;
  comentarioComp2: string | null;
  comentarioComp3: string | null;
  comentarioComp4: string | null;
  comentarioComp5: string | null;
  parecerGeral: string | null;
  recadoAdmin: string | null;
  comentarioAjusteAdmin: string | null;
  statusAprovacao: 'PENDENTE_APROVACAO' | 'APROVADA' | 'AJUSTE_SOLICITADO' | 'LIBERADA';
  dataCorrecao: string;
  versao: {
    id: number;
    idRedacao: number;
    numeroVersao: number;
    conteudoTexto: string;
    dataEnvio: string | null;
    redacao: {
      id: number;
      tipoFluxo: 'TREINO' | 'AVALIATIVA';
      aluno: {
        idUsuario: number;
        usuario: { id: number; nome: string; email: string };
        tutor?: {
          turma?: { id: number; nome: string };
          usuario?: { id: number; nome: string; email: string };
        };
      };
      tarefa?: { id: number; modalidade: string; prazoEntrega: string; tituloTarefa: string } | null;
      tema?: { id: number; tituloTema: string } | null;
    };
  };
  tutor: { idUsuario: number; usuario: { id: number; nome: string; email: string } };
  anotacoes: Array<{
    id: number;
    posicaoInicio: number;
    posicaoFinal: number;
    textoSelecionado: string;
    tipoErro: string;
    sugestaoComentario: string | null;
  }>;
}

export const adminService = {
  // Turmas
  turmas: (signal?: AbortSignal) => api.get<TurmaAdmin[]>('turmas', undefined, signal),
  obterTurma: (idTurma: number, signal?: AbortSignal) => api.get<TurmaDetalhada>(`turmas/${idTurma}`, undefined, signal),
  criarTurma: (dados: NovaTurmaInput) => api.post<TurmaAdmin>('turmas', dados),
  atualizarTurma: (idTurma: number, dados: Partial<NovaTurmaInput>) => api.patch<TurmaAdmin>(`turmas/${idTurma}`, dados),
  arquivarTurma: (idTurma: number) => api.post<TurmaAdmin>(`turmas/${idTurma}/arquivar`),
  desarquivarTurma: (idTurma: number) => api.post<TurmaAdmin>(`turmas/${idTurma}/desarquivar`),

  // Convites
  gerarConviteTutor: (idTurma: number, usosMaximos: number) =>
    api.post<ConviteCriado>(`turmas/${idTurma}/convites/tutor`, { usosMaximos }),
  convites: (turmaId?: number, signal?: AbortSignal) =>
    api.get<ConviteAdminItem[]>('convites', turmaId ? { turmaId } : undefined, signal),

  // Usuários e Remanejamentos
  usuariosTutores: (idTurma?: number, signal?: AbortSignal) =>
    api.get<UsuarioTutorItem[]>('usuarios', { papel: 'TUTOR', ...(idTurma ? { idTurma } : {}) }, signal),
  transferirAluno: (idAluno: number, idTutor: number) =>
    api.patch<unknown>(`alunos/${idAluno}/tutor`, { idTutor }),
  transferirTutor: (idTutor: number, idTurma: number) =>
    api.patch<unknown>(`tutores/${idTutor}/turma`, { idTurma }),

  // Revisão de Correções
  correcoesPendentes: (signal?: AbortSignal) =>
    api.get<CorrecaoPendenteItem[]>('correcoes/pendentes', undefined, signal),
  obterCorrecao: (idCorrecao: number, signal?: AbortSignal) =>
    api.get<CorrecaoPendenteItem>(`correcoes/${idCorrecao}`, undefined, signal),
  aprovarCorrecao: (idCorrecao: number) =>
    api.post<CorrecaoPendenteItem>(`correcoes/${idCorrecao}/aprovar`),
  solicitarAjuste: (idCorrecao: number, comentarioAjuste: string) =>
    api.post<CorrecaoPendenteItem>(`correcoes/${idCorrecao}/solicitar-ajuste`, { comentarioAjuste }),

  // Histórico Geral
  historicoGeral: (
    filtros: { mes?: string; idTurma?: number; idTutor?: number; tipoFluxo?: string },
    signal?: AbortSignal
  ) => api.get<ItemDoHistorico[]>('indicadores/historico-correcoes', filtros, signal),

  // Tarefas Gerais (Modelos da Administração)
  tarefas: (signal?: AbortSignal) => api.get<TarefaDoTutor[]>('tarefas', undefined, signal),
  obterTarefa: (idTarefa: number, signal?: AbortSignal) => api.get<TarefaDoTutor>(`tarefas/${idTarefa}`, undefined, signal),
  criarTarefaGeral: (dados: DadosDeTarefa) => api.post<TarefaDoTutor>('tarefas', dados),
  atualizarTarefaGeral: (idTarefa: number, dados: Partial<DadosDeTarefa>) => api.patch<TarefaDoTutor>(`tarefas/${idTarefa}`, dados),
  excluirTarefaGeral: (idTarefa: number) => api.delete<void>(`tarefas/${idTarefa}`),
  adicionarAnexo: (idTarefa: number, dados: DadosDeAnexo) => api.post<AnexoCriado>(`tarefas/${idTarefa}/anexos`, dados),
  removerAnexo: (idTarefa: number, idAnexo: number) => api.delete<void>(`tarefas/${idTarefa}/anexos/${idAnexo}`),
};
