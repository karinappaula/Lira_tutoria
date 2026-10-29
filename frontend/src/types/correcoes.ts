import type { Redacao, StatusVersao, TarefaDaRedacao, TemaResumo, VersaoRedacao } from '@/types/redacoes';

export type StatusAprovacao = 'PENDENTE_APROVACAO' | 'APROVADA' | 'AJUSTE_SOLICITADO' | 'LIBERADA';

/** Valores Decimal do Prisma chegam como texto ("160") ou número, conforme a rota. */
export type Decimal = string | number | null;

export interface AnotacaoDaCorrecao {
  id: number;
  idCorrecao: number;
  posicaoInicio: number;
  posicaoFinal: number;
  textoSelecionado: string;
  tipoErro: string;
  sugestaoComentario: string | null;
}

export interface CorrecaoDaVersao {
  id: number;
  idVersao: number;
  idTutor: number;
  numeroAjuste: number;
  notaComp1: Decimal;
  notaComp2: Decimal;
  notaComp3: Decimal;
  notaComp4: Decimal;
  notaComp5: Decimal;
  notaTotal: Decimal;
  comentarioComp1: string | null;
  comentarioComp2: string | null;
  comentarioComp3: string | null;
  comentarioComp4: string | null;
  comentarioComp5: string | null;
  parecerGeral: string | null;
  statusAprovacao: StatusAprovacao;
  dataCorrecao: string;
  anotacoes: AnotacaoDaCorrecao[];
  tutor?: { idUsuario: number; usuario: { nome: string } };
  /** Só o Tutor e a Administração recebem estes dois campos */
  recadoAdmin?: string | null;
  comentarioAjusteAdmin?: string | null;
}

export interface VersaoComCorrecoes extends VersaoRedacao {
  correcoes: CorrecaoDaVersao[];
}

/** GET /redacoes/:id (detalhe, com histórico). Para Tutor/Admin inclui o aluno. */
export interface RedacaoDetalhada extends Omit<Redacao, 'versoes'> {
  versoes: VersaoComCorrecoes[];
  aluno?: { idUsuario: number; usuario: { nome: string } };
}

/** Item de GET /redacoes/aguardando-correcao (é uma VERSÃO, com a redação dentro) */
export interface ItemDaFila {
  id: number;
  idRedacao: number;
  numeroVersao: 1 | 2;
  statusVersao: StatusVersao;
  dataEnvio: string | null;
  redacao: {
    id: number;
    tipoFluxo: 'TREINO' | 'AVALIATIVA';
    tema: Pick<TemaResumo, 'id' | 'tituloTema'> | null;
    tarefa: { id: number; tituloTarefa: string; prazoEntrega: string } | null;
    aluno: { idUsuario: number; usuario: { nome: string } };
  };
  correcoes: Array<{ id: number; numeroAjuste: number; statusAprovacao: StatusAprovacao; comentarioAjusteAdmin: string | null }>;
}

/** Corpo de POST /redacoes/correcoes */
export interface NovaCorrecao {
  idVersao: number;
  notaComp1: number;
  notaComp2: number;
  notaComp3: number;
  notaComp4: number;
  notaComp5: number;
  comentarioComp1: string;
  comentarioComp2: string;
  comentarioComp3: string;
  comentarioComp4: string;
  comentarioComp5: string;
  parecerGeral?: string;
  recadoAdmin?: string;
  anotacoes: Array<{
    posicaoInicio: number;
    posicaoFinal: number;
    textoSelecionado: string;
    tipoErro: string;
    sugestaoComentario?: string;
  }>;
}

/** Item de GET /indicadores/tutor/alunos */
export interface Tutorado {
  idAluno: number;
  nome: string;
  email: string;
  status: string;
  turma: { id: number; nome: string } | null;
  redacoesEnviadas: number;
  simuladosRealizados: number;
  aproveitamento: number | null;
}

/** Item de GET /indicadores/historico-correcoes */
export interface ItemDoHistorico {
  idCorrecao: number;
  idRedacao: number;
  tipoFluxo: 'TREINO' | 'AVALIATIVA';
  numeroVersao: 1 | 2;
  aluno: { id: number; nome: string };
  turma: { id: number; nome: string } | null;
  tutor: { id: number; nome: string };
  data: string;
  notaTotal: number | null;
  statusAprovacao: StatusAprovacao;
  statusRotulo: string;
  ajustes: number;
}

/** Resposta de POST /tutor/convites/aluno */
export interface ConviteCriado {
  codigo: string;
  papel: 'TUTOR' | 'ALUNO';
  idTurma: number;
  idTutor: number | null;
  expiraEm: string;
  usado: boolean;
  usos?: number;
  usosMaximos?: number;
  vagasRestantes?: number;
}

/** Item de GET /tarefas na visão do Tutor */
export interface TarefaDoTutor {
  id: number;
  tituloTarefa: string;
  descricao: string | null;
  prazoEntrega: string;
  modalidade: 'AVALIATIVA' | 'GERAL';
  idTutor: number | null;
  idTema: number | null;
  tema: TemaResumo | null;
  anexos: Array<{ id: number; nomeArquivo: string; caminhoArquivo: string; tipoArquivo: string; criadoEm?: string }>;
  idAdm?: number | null;
  idTurma?: number | null;
  idTarefaOrigem?: number | null;
  turma?: { id: number; nome: string; anoLetivo: number; status: string } | null;
  tutor?: { idUsuario: number; usuario: { nome: string } } | null;
  administrador?: { idUsuario: number; usuario: { nome: string } } | null;
  _count?: { tarefasAplicadas: number; redacoes?: number };
  criadoEm?: string;
  progresso: { totalTutorados: number; concluidas: number; emCorrecao: number } | null;
}

export type TarefaGeralAdmin = TarefaDoTutor;
export type { TarefaDaRedacao };