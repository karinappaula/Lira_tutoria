export interface CompetenciaMedia {
  competencia: number;
  nome: string;
  media: number;
}

export interface PontoEvolucaoRedacao {
  ordem: number;
  idRedacao: number;
  tipoFluxo: string;
  numeroVersao: number;
  data: string;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  notaTotal: number;
}

export interface AssuntoDesempenho {
  idAssunto: number;
  nomeAssunto: string;
  total: number;
  acertos: number;
  percentual: number;
}

export interface ResumoSimulados {
  realizados: number;
  acertos: number;
  questoes: number;
  aproveitamentoGeral: number;
  aproveitamentoMedio: number;
  desempenhoPorAssunto: AssuntoDesempenho[];
}

export interface IndicadoresAlunoResponse {
  simulados: ResumoSimulados;
  redacoes: {
    corrigidas: number;
    mediaNotaTotal: number;
    mediaPorCompetencia: CompetenciaMedia[];
    evolucao: PontoEvolucaoRedacao[];
    variacaoUltimaNota: { anterior: number; atual: number } | null;
  };
}

export interface IndicadoresAlunoGestaoResponse extends IndicadoresAlunoResponse {
  aluno: {
    id: number;
    nome: string;
    turma: { id: number; nome: string };
  };
}

export interface AlunoRedacaoTutor {
  idAluno: number;
  nome: string;
  redacoesEnviadas: number;
  pendentes: number;
  aprovadas: number;
  mediaNota: number | null;
  ultimaNota: number | null;
}

export interface DesempenhoRedacoesTutorResponse {
  porAluno: AlunoRedacaoTutor[];
  totais: {
    enviadas: number;
    pendentes: number;
    aprovadas: number;
  };
  mediaPorCompetencia: CompetenciaMedia[];
}

export interface AlunoSimuladoTutor {
  idAluno: number;
  nome: string;
  realizados: number;
  aproveitamentoGeral: number;
}

export interface DesempenhoSimuladosTutorResponse {
  grupo: {
    realizados: number;
    aproveitamentoGeral: number;
    aproveitamentoMedio: number;
  };
  rankingAssuntos: AssuntoDesempenho[];
  porAluno: AlunoSimuladoTutor[];
}

export interface DesempenhoTurmaItem {
  idTurma: number;
  nome: string;
  anoLetivo: number;
  tutores: number;
  alunos: number;
  simulados: {
    aplicados: number;
    aproveitamento: number;
    mediaGeral1000: number;
    faixa: 'ALTO' | 'MEDIO' | 'BAIXO' | null;
  };
  redacoes: {
    enviadas: number;
    mediaNota: number | null;
    competenciaMaisFraca: CompetenciaMedia | null;
    mediaPorCompetencia: CompetenciaMedia[];
  };
}

export interface DesempenhoTutorItem {
  idTutor: number;
  nome: string;
  turma: { id: number; nome: string };
  tutorados: number;
  correcoesRealizadas: number;
  aguardandoAprovacao: number;
  ajustesSolicitados: number;
  mediaNotaGrupo: number | null;
}
