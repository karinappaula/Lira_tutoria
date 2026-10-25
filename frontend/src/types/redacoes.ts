/**
 * Contratos de redações, temas e tarefas, conferidos no CÓDIGO do backend
 * (redacao.service.ts, tarefa.service.ts, tema.service.ts, schema.prisma).
 * Datas chegam como texto ISO 8601 (UTC).
 */

export type TipoFluxo = 'TREINO' | 'AVALIATIVA';

export type StatusVersao =
  | 'RASCUNHO'
  | 'ENVIADA'
  | 'EM_CORRECAO'
  | 'CORRIGIDA'
  | 'AGUARDANDO_REESCRITA'
  | 'AJUSTE_SOLICITADO';

export interface TemaResumo {
  id: number;
  tituloTema: string;
  textoMotivador: string | null;
}

/** Item de GET /temas */
export interface Tema extends TemaResumo {
  origem: string | null;
  idCriador: number | null;
}

export interface VersaoRedacao {
  id: number;
  idRedacao: number;
  numeroVersao: 1 | 2;
  conteudoTexto: string;
  statusVersao: StatusVersao;
  criadoEm: string;
  dataEnvio: string | null;
}

export interface AnexoDeTarefa {
  id: number;
  nomeArquivo: string;
  caminhoArquivo: string;
  tipoArquivo: string;
  criadoEm: string;
}

export interface TurmaResumo {
  id: number;
  nome: string;
  anoLetivo: number;
  status: string;
}

/** Tarefa dentro de uma redação (GET /redacoes) */
export interface TarefaDaRedacao {
  id: number;
  tituloTarefa: string;
  descricao: string | null;
  prazoEntrega: string;
  modalidade: 'AVALIATIVA' | 'GERAL';
  idTema: number | null;
  tema: TemaResumo | null;
  turma: TurmaResumo | null;
}

/** Itens de GET /redacoes e GET /redacoes/:id (visão do aluno) */
export interface Redacao {
  id: number;
  idAluno: number;
  idTarefa: number | null;
  idTema: number | null;
  tipoFluxo: TipoFluxo;
  criadoEm: string;
  tema: TemaResumo | null;
  tarefa: TarefaDaRedacao | null;
  /** Ordenadas: [versão 1, versão 2?]. A versão atual é sempre a última. */
  versoes: VersaoRedacao[];
}

/** Item de GET /tarefas na visão do aluno */
export interface TarefaDoAluno {
  id: number;
  tituloTarefa: string;
  descricao: string | null;
  prazoEntrega: string;
  modalidade: 'AVALIATIVA' | 'GERAL';
  idTema: number | null;
  tema: TemaResumo | null;
  tutor: { idUsuario: number; usuario: { nome: string } } | null;
  anexos: AnexoDeTarefa[];
  /** Id da redação já criada para esta tarefa, ou null se o aluno ainda não começou. */
  idRedacao: number | null;
}

/** Corpo de POST /redacoes */
export type NovaRedacao =
  | { tipoFluxo: 'TREINO'; idTema: number }
  | { tipoFluxo: 'TREINO'; temaProprio: { tituloTema: string; textoMotivador?: string } }
  | { tipoFluxo: 'AVALIATIVA'; idTarefa: number };