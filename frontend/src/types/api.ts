export type PapelUsuario = 'ADMINISTRADOR' | 'TUTOR' | 'ALUNO';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  status: 'ATIVO' | 'INATIVO';
  criadoEm?: string;
}

export interface SessaoResposta {
  tipo: 'sessao';
  token: string;
  papelAtivo: PapelUsuario;
  usuario: Usuario;
}

export interface SelecaoPendenteResposta {
  tipo: 'selecao_pendente';
  token: string;
  papeisDisponiveis: PapelUsuario[];
  usuario: Usuario;
}

export type LoginResposta = SessaoResposta | SelecaoPendenteResposta;

export interface ErroDetalheAPI {
  campo: string;
  mensagem: string;
}

export interface ErroAPI {
  erro: string;
  codigo: string;
  detalhes?: ErroDetalheAPI[];
}

export interface Turma {
  id: number;
  nome: string;
  anoLetivo: number;
  vestibularFoco: string;
  status: 'ATIVA' | 'ARQUIVADA' | 'INATIVA';
  criadoEm?: string;
}

export interface Tema {
  id: number;
  tituloTema: string;
  textoMotivador?: string | null;
  origem?: string | null;
  idCriador?: number | null;
}

export interface Anexo {
  id: number;
  idTarefa: number;
  nomeArquivo: string;
  caminhoArquivo: string;
  tipoArquivo: string;
  criadoEm: string;
}

export interface Tarefa {
  id: number;
  idTutor?: number | null;
  idAdm?: number | null;
  idTurma?: number | null;
  idTema?: number | null;
  idTarefaOrigem?: number | null;
  tituloTarefa: string;
  descricao?: string | null;
  prazoEntrega: string;
  modalidade: 'AVALIATIVA' | 'GERAL';
  criadoEm: string;
  tema?: Tema;
  anexos?: Anexo[];
}

export interface VersaoRedacao {
  id: number;
  idRedacao: number;
  numeroVersao: number;
  conteudoTexto: string;
  statusVersao: 'RASCUNHO' | 'ENVIADA' | 'EM_CORRECAO' | 'CORRIGIDA' | 'AGUARDANDO_REESCRITA' | 'AJUSTE_SOLICITADO';
  criadoEm: string;
  dataEnvio?: string | null;
}

export interface Anotacao {
  id?: number;
  posicaoInicio: number;
  posicaoFinal: number;
  textoSelecionado: string;
  tipoErro: string;
  sugestaoComentario?: string | null;
}

export interface Correcao {
  id: number;
  idVersao: number;
  idTutor: number;
  idAdm?: number | null;
  numeroAjuste: number;
  notaComp1: number;
  notaComp2: number;
  notaComp3: number;
  notaComp4: number;
  notaComp5: number;
  notaTotal: number;
  comentarioComp1?: string;
  comentarioComp2?: string;
  comentarioComp3?: string;
  comentarioComp4?: string;
  comentarioComp5?: string;
  parecerGeral?: string;
  recadoAdmin?: string;
  comentarioAjusteAdmin?: string;
  statusAprovacao: 'PENDENTE_APROVACAO' | 'AJUSTE_SOLICITADO' | 'APROVADA';
  dataCorrecao: string;
  anotacoes?: Anotacao[];
}

export interface Redacao {
  id: number;
  idAluno: number;
  idTarefa?: number | null;
  idTema?: number | null;
  tipoFluxo: 'TREINO' | 'AVALIATIVA';
  criadoEm: string;
  tema?: Tema;
  tarefa?: Tarefa;
  versoes?: VersaoRedacao[];
}

export interface Alternativa {
  id?: number;
  letraOpcao: string;
  textoAlternativa: string;
  alternativaCorreta: boolean;
}

export interface Assunto {
  id: number;
  nomeAssunto: string;
}

export interface Questao {
  id: number;
  enunciado: string;
  imagemUrl?: string | null;
  vestibular: string;
  ano: number;
  numeroQuestao?: number | null;
  grauDificuldade: 'FACIL' | 'MEDIA' | 'DIFICIL';
  explicacaoGabarito?: string | null;
  status: 'ATIVA' | 'INATIVA';
  alternativas: Alternativa[];
  assuntos?: Assunto[];
}

export interface RespostaPaginadaQuestoes {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  itens: Questao[];
}
