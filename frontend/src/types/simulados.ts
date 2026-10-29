export interface Assunto {
  id: number;
  nomeAssunto: string;
  _count?: {
    questoes: number;
  };
}

export interface Alternativa {
  id?: number;
  letraOpcao: string;
  textoAlternativa: string;
  alternativaCorreta?: boolean;
}

export interface QuestaoAssuntoVinculo {
  idQuestao?: number;
  idAssunto?: number;
  assunto: Assunto;
}

export interface Questao {
  id: number;
  enunciado: string;
  imagemUrl?: string | null;
  vestibular: string;
  ano: number;
  numeroQuestao?: number | null;
  grauDificuldade: 'FACIL' | 'MEDIA' | 'DIFICIL' | string;
  explicacaoGabarito?: string | null;
  status: 'ATIVA' | 'INATIVA' | string;
  criadoEm?: string;
  criadoPor?: number;
  alternativas: Alternativa[];
  assuntos: QuestaoAssuntoVinculo[];
}

export interface FiltroQuestoes {
  vestibular?: string;
  ano?: number;
  grauDificuldade?: string;
  idAssunto?: number;
  status?: string;
  busca?: string;
  pagina?: number;
  limite?: number;
}

export interface RespostaQuestoesPaginadas {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  itens: Questao[];
}

export interface CriarQuestaoPayload {
  enunciado: string;
  imagemUrl?: string;
  vestibular: string;
  ano: number;
  numeroQuestao?: number;
  grauDificuldade: string;
  explicacaoGabarito?: string;
  idAssuntos: number[];
  alternativas: Array<{
    letraOpcao: string;
    textoAlternativa: string;
    alternativaCorreta: boolean;
  }>;
}

export interface SimuladoResumo {
  id: number;
  idAluno: number;
  tipoSimulado: 'PERSONALIZADO' | 'CADERNO_ERROS' | string;
  dataInicio: string;
  dataFim?: string | null;
  tempoGastoSeg?: number | null;
  tempoAcumuladoSeg: number;
  statusSimulado: 'CRIADO' | 'EM_ANDAMENTO' | 'PAUSADO' | 'FINALIZADO' | string;
  pontuacaoTotal?: number | string | null;
  _count?: {
    questoes: number;
  };
}

export interface ItemQuestaoSimulado {
  idSimulado: number;
  idQuestao: number;
  ordem: number;
  respostaAluno: string | null;
  indicadorAcerto?: boolean | null;
  dataResposta?: string | null;
  questao: {
    id: number;
    enunciado: string;
    imagemUrl?: string | null;
    vestibular: string;
    ano: number;
    numeroQuestao?: number | null;
    grauDificuldade: string;
    alternativas: Array<{
      id: number;
      letraOpcao: string;
      textoAlternativa: string;
    }>;
    assuntos: QuestaoAssuntoVinculo[];
  };
}

export interface SimuladoExecucao {
  id: number;
  idAluno: number;
  tipoSimulado: string;
  dataInicio: string;
  dataFim?: string | null;
  tempoGastoSeg?: number | null;
  tempoAcumuladoSeg: number;
  retomadoEm?: string | null;
  statusSimulado: 'CRIADO' | 'EM_ANDAMENTO' | 'PAUSADO' | 'FINALIZADO' | string;
  pontuacaoTotal?: number | string | null;
  questoes: ItemQuestaoSimulado[];
  cronometro: {
    tempoDecorridoSeg: number;
    agoraServidor: string;
  };
  progresso: {
    total: number;
    respondidas: number;
    restantes: number;
  };
  quantidadeSolicitada?: number;
  aviso?: string | null;
}

export interface CriarSimuladoPayload {
  quantidade: number;
  vestibular?: string;
  ano?: number;
  grauDificuldade?: string;
  idAssunto?: number;
}

export interface RespostaSalva {
  idSimulado: number;
  idQuestao: number;
  ordem: number;
  respostaAluno: string | null;
  indicadorAcerto?: boolean | null;
  dataResposta?: string | null;
  progresso: {
    total: number;
    respondidas: number;
    restantes: number;
  };
}

export interface ResultadoItemQuestao {
  ordem: number;
  idQuestao: number;
  enunciado: string;
  imagemUrl?: string | null;
  vestibular: string;
  ano: number;
  numeroQuestao?: number | null;
  assuntos: Assunto[];
  alternativas: Array<{
    letraOpcao: string;
    textoAlternativa: string;
  }>;
  respostaAluno: string | null;
  respostaCorreta: string | null;
  respondida: boolean;
  acertou: boolean;
  explicacaoGabarito?: string | null;
}

export interface DesempenhoAssunto {
  idAssunto: number;
  nomeAssunto: string;
  total: number;
  acertos: number;
  percentual: number;
}

export interface ResultadoSimulado {
  idSimulado: number;
  tipoSimulado: string;
  dataInicio: string;
  dataFim: string | null;
  tempoGastoSeg: number | null;
  resumo: {
    total: number;
    acertos: number;
    erros: number;
    emBranco: number;
    percentual: number;
  };
  desempenhoPorAssunto: DesempenhoAssunto[];
  itens: ResultadoItemQuestao[];
}

export interface ItemCadernoErros {
  id: number;
  idAluno: number;
  idQuestao: number;
  quantidadeErros: number;
  statusRevisao: 'ATIVO' | 'REVISADO' | string;
  dataPrimeiroErro: string;
  dataUltimoErro: string;
  questao: Questao;
}

export interface RefazerErrosPayload {
  quantidade?: number;
  idAssunto?: number;
  idsCaderno?: number[];
}
