import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import type { PapelAtivo } from "./token.service";

// Correção que já pode ser vista pelo aluno: aprovada pela Administração
// (avaliativa) ou liberada direto pelo Tutor (treino). Só estas contam nas notas.
const STATUS_LIBERADA = ["APROVADA", "LIBERADA"];
// Versões que ainda dependem do Tutor ou da Administração.
const STATUS_PENDENTE = ["ENVIADA", "EM_CORRECAO", "AJUSTE_SOLICITADO"];

// Competências oficiais do ENEM (RF16).
const COMPETENCIAS = [
  { competencia: 1, nome: "Domínio da norma culta" },
  { competencia: 2, nome: "Compreensão da proposta" },
  { competencia: 3, nome: "Seleção e organização de argumentos" },
  { competencia: 4, nome: "Mecanismos linguísticos" },
  { competencia: 5, nome: "Proposta de intervenção" },
];

const num = (valor: unknown) => Number(valor ?? 0);
const arredondar = (valor: number, casas = 1) => {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
};
const media = (valores: number[]) =>
  valores.length ? valores.reduce((soma, valor) => soma + valor, 0) / valores.length : 0;

// Faixas sugeridas pelo protótipo (78,5% Alto; 69% Médio; 58% Baixo).
// Ajustáveis aqui, em um só lugar.
export function faixaDeAproveitamento(percentual: number): "ALTO" | "MEDIO" | "BAIXO" {
  if (percentual >= 70) return "ALTO";
  if (percentual >= 60) return "MEDIO";
  return "BAIXO";
}

const ROTULO_STATUS: Record<string, string> = {
  PENDENTE_APROVACAO: "Aguardando revisão do Admin",
  AJUSTE_SOLICITADO: "Ajuste solicitado",
  APROVADA: "Aprovada",
  LIBERADA: "Liberada",
};

// ------------------------------------------------------------- correções

const contextoDaCorrecao = {
  versao: {
    select: {
      numeroVersao: true,
      redacao: {
        select: {
          id: true,
          tipoFluxo: true,
          idAluno: true,
          aluno: {
            select: {
              idTutor: true,
              usuario: { select: { nome: true } },
              tutor: {
                select: { idTurma: true, turma: { select: { id: true, nome: true } }, usuario: { select: { nome: true } } },
              },
            },
          },
        },
      },
    },
  },
} as const;

async function buscarCorrecoesLiberadas(where: Prisma.CorrecaoWhereInput) {
  return prisma.correcao.findMany({
    where: { ...where, statusAprovacao: { in: STATUS_LIBERADA } },
    orderBy: { dataCorrecao: "asc" },
    include: contextoDaCorrecao,
  });
}

type CorrecaoLiberada = Awaited<ReturnType<typeof buscarCorrecoesLiberadas>>[number];

function notasDe(correcao: CorrecaoLiberada): number[] {
  return [
    num(correcao.notaComp1),
    num(correcao.notaComp2),
    num(correcao.notaComp3),
    num(correcao.notaComp4),
    num(correcao.notaComp5),
  ];
}

function notaTotalDe(correcao: CorrecaoLiberada): number {
  return correcao.notaTotal !== null ? num(correcao.notaTotal) : notasDe(correcao).reduce((a, b) => a + b, 0);
}

function mediaPorCompetencia(correcoes: CorrecaoLiberada[]) {
  return COMPETENCIAS.map((competencia, indice) => ({
    ...competencia,
    media: arredondar(media(correcoes.map((correcao) => notasDe(correcao)[indice]))),
  }));
}

function pontoDeEvolucao(correcao: CorrecaoLiberada, ordem: number) {
  const notas = notasDe(correcao);
  return {
    ordem,
    idRedacao: correcao.versao.redacao.id,
    tipoFluxo: correcao.versao.redacao.tipoFluxo,
    numeroVersao: correcao.versao.numeroVersao,
    data: correcao.dataCorrecao,
    c1: notas[0],
    c2: notas[1],
    c3: notas[2],
    c4: notas[3],
    c5: notas[4],
    notaTotal: notaTotalDe(correcao),
  };
}

// ------------------------------------------------------------- simulados

async function carregarSimuladosFinalizados(idsAlunos: number[]) {
  if (idsAlunos.length === 0) return [];
  return prisma.simulado.findMany({
    where: { idAluno: { in: idsAlunos }, statusSimulado: "FINALIZADO" },
    orderBy: { dataFim: "asc" },
    include: {
      questoes: {
        select: {
          indicadorAcerto: true,
          questao: {
            select: { assuntos: { select: { assunto: { select: { id: true, nomeAssunto: true } } } } },
          },
        },
      },
    },
  });
}

type SimuladoFinalizado = Awaited<ReturnType<typeof carregarSimuladosFinalizados>>[number];

// Aproveitamento geral = acertos / questões. Médio = média dos percentuais
// de cada simulado. Por assunto: do pior para o melhor, que é também o
// ranking de dificuldade (maior índice de erro primeiro).
function resumirSimulados(simulados: SimuladoFinalizado[]) {
  let acertos = 0;
  let total = 0;
  const percentuais: number[] = [];
  const porAssunto = new Map<number, { idAssunto: number; nomeAssunto: string; total: number; acertos: number }>();

  for (const simulado of simulados) {
    let acertosDoSimulado = 0;
    for (const item of simulado.questoes) {
      const acertou = item.indicadorAcerto === true;
      total += 1;
      if (acertou) {
        acertos += 1;
        acertosDoSimulado += 1;
      }
      for (const vinculo of item.questao.assuntos) {
        const atual = porAssunto.get(vinculo.assunto.id) ?? {
          idAssunto: vinculo.assunto.id,
          nomeAssunto: vinculo.assunto.nomeAssunto,
          total: 0,
          acertos: 0,
        };
        atual.total += 1;
        if (acertou) atual.acertos += 1;
        porAssunto.set(vinculo.assunto.id, atual);
      }
    }
    if (simulado.questoes.length > 0) {
      percentuais.push((acertosDoSimulado / simulado.questoes.length) * 100);
    }
  }

  const desempenhoPorAssunto = [...porAssunto.values()]
    .map((assunto) => {
      const percentual = arredondar((assunto.acertos / assunto.total) * 100);
      return { ...assunto, percentual, indiceErro: arredondar(100 - percentual) };
    })
    .sort((a, b) => a.percentual - b.percentual);

  return {
    realizados: simulados.length,
    questoes: total,
    acertos,
    aproveitamentoGeral: total > 0 ? arredondar((acertos / total) * 100) : 0,
    aproveitamentoMedio: arredondar(media(percentuais)),
    desempenhoPorAssunto,
  };
}

// ----------------------------------------------------------------- aluno

// Tela "Estatísticas" do aluno (RF16): simulados por assunto e evolução
// das notas por competência.
export async function indicadoresDoAluno(idAluno: number) {
  const [simulados, correcoes] = await Promise.all([
    carregarSimuladosFinalizados([idAluno]),
    buscarCorrecoesLiberadas({ versao: { redacao: { idAluno } } }),
  ]);

  const evolucao = correcoes.map((correcao, indice) => pontoDeEvolucao(correcao, indice + 1));
  const ultima = evolucao[evolucao.length - 1];
  const anterior = evolucao[evolucao.length - 2];

  return {
    simulados: resumirSimulados(simulados),
    redacoes: {
      corrigidas: evolucao.length,
      mediaNotaTotal: arredondar(media(evolucao.map((ponto) => ponto.notaTotal))),
      mediaPorCompetencia: mediaPorCompetencia(correcoes),
      evolucao,
      variacaoUltimaNota: ultima && anterior ? { anterior: anterior.notaTotal, atual: ultima.notaTotal } : null,
    },
  };
}

// Tutor (apenas tutorados, RN13) e Administração (qualquer aluno).
export async function indicadoresDoAlunoParaGestao(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  idAluno: number
) {
  const aluno = await prisma.aluno.findUnique({
    where: { idUsuario: idAluno },
    include: {
      usuario: { select: { nome: true } },
      tutor: { select: { turma: { select: { id: true, nome: true } } } },
    },
  });
  if (!aluno) {
    throw new ErroNegocio("Aluno não encontrado.", 404, "ALUNO_NAO_ENCONTRADO");
  }
  if (papelAtivo === "TUTOR" && aluno.idTutor !== idUsuario) {
    throw new ErroNegocio("Você não possui acesso a este aluno.", 403, "SEM_PERMISSAO");
  }
  return {
    aluno: { id: aluno.idUsuario, nome: aluno.usuario.nome, turma: aluno.tutor.turma },
    ...(await indicadoresDoAluno(idAluno)),
  };
}

// ----------------------------------------------------------------- tutor

// Tela "Meus alunos": lista de tutorados com redações enviadas e aproveitamento.
export async function listarTutorados(idTutor: number, busca?: string) {
  const alunos = await prisma.aluno.findMany({
    where: { idTutor, ...(busca ? { usuario: { nome: { contains: busca } } } : {}) },
    orderBy: { usuario: { nome: "asc" } },
    include: {
      usuario: { select: { nome: true, email: true, status: true } },
      tutor: { select: { turma: { select: { id: true, nome: true } } } },
      redacoes: { select: { versoes: { select: { dataEnvio: true } } } },
    },
  });
  const simulados = await carregarSimuladosFinalizados(alunos.map((aluno) => aluno.idUsuario));

  return alunos.map((aluno) => {
    const resumo = resumirSimulados(simulados.filter((simulado) => simulado.idAluno === aluno.idUsuario));
    return {
      idAluno: aluno.idUsuario,
      nome: aluno.usuario.nome,
      email: aluno.usuario.email,
      status: aluno.usuario.status,
      turma: aluno.tutor.turma,
      redacoesEnviadas: aluno.redacoes.filter((redacao) =>
        redacao.versoes.some((versao) => versao.dataEnvio !== null)
      ).length,
      simuladosRealizados: resumo.realizados,
      aproveitamento: resumo.realizados > 0 ? resumo.aproveitamentoGeral : null,
    };
  });
}

// Tela "Desempenho em Redações" do Tutor (US31, US32).
export async function desempenhoRedacoesDoTutor(idTutor: number) {
  const [alunos, correcoes] = await Promise.all([
    prisma.aluno.findMany({
      where: { idTutor },
      orderBy: { usuario: { nome: "asc" } },
      select: {
        idUsuario: true,
        usuario: { select: { nome: true } },
        redacoes: { select: { id: true, versoes: { select: { statusVersao: true, dataEnvio: true } } } },
      },
    }),
    buscarCorrecoesLiberadas({ versao: { redacao: { aluno: { idTutor } } } }),
  ]);

  const porAluno = alunos.map((aluno) => {
    const doAluno = correcoes.filter((correcao) => correcao.versao.redacao.idAluno === aluno.idUsuario);
    const idsAprovadas = new Set(doAluno.map((correcao) => correcao.versao.redacao.id));
    const totais = doAluno.map(notaTotalDe);
    return {
      idAluno: aluno.idUsuario,
      nome: aluno.usuario.nome,
      redacoesEnviadas: aluno.redacoes.filter((redacao) =>
        redacao.versoes.some((versao) => versao.dataEnvio !== null)
      ).length,
      pendentes: aluno.redacoes.filter((redacao) =>
        redacao.versoes.some((versao) => STATUS_PENDENTE.includes(versao.statusVersao))
      ).length,
      aprovadas: idsAprovadas.size,
      mediaNota: totais.length ? arredondar(media(totais)) : null,
      ultimaNota: totais.length ? totais[totais.length - 1] : null,
    };
  });

  return {
    porAluno,
    totais: {
      enviadas: porAluno.reduce((soma, item) => soma + item.redacoesEnviadas, 0),
      pendentes: porAluno.reduce((soma, item) => soma + item.pendentes, 0),
      aprovadas: porAluno.reduce((soma, item) => soma + item.aprovadas, 0),
    },
    mediaPorCompetencia: mediaPorCompetencia(correcoes),
  };
}

// Briefing: ranking dos assuntos de maior dificuldade do grupo, do maior
// para o menor índice de erro, mais o resumo de cada tutorado nos simulados.
export async function desempenhoSimuladosDoTutor(idTutor: number) {
  const alunos = await prisma.aluno.findMany({
    where: { idTutor },
    orderBy: { usuario: { nome: "asc" } },
    select: { idUsuario: true, usuario: { select: { nome: true } } },
  });
  const simulados = await carregarSimuladosFinalizados(alunos.map((aluno) => aluno.idUsuario));
  const grupo = resumirSimulados(simulados);

  return {
    grupo: {
      realizados: grupo.realizados,
      aproveitamentoGeral: grupo.aproveitamentoGeral,
      aproveitamentoMedio: grupo.aproveitamentoMedio,
    },
    rankingAssuntos: grupo.desempenhoPorAssunto,
    porAluno: alunos.map((aluno) => {
      const resumo = resumirSimulados(simulados.filter((simulado) => simulado.idAluno === aluno.idUsuario));
      return {
        idAluno: aluno.idUsuario,
        nome: aluno.usuario.nome,
        realizados: resumo.realizados,
        aproveitamentoGeral: resumo.aproveitamentoGeral,
      };
    }),
  };
}

// ------------------------------------------------------ histórico geral

export interface FiltroHistorico {
  idTutor?: number;
  idTurma?: number;
  mes?: string; // AAAA-MM
  tipoFluxo?: string;
}

function periodoDoMes(mes: string): { inicio: Date; fim: Date } {
  const encontrado = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(mes);
  if (!encontrado) {
    throw new ErroNegocio("Informe o mês no formato AAAA-MM.", 400, "MES_INVALIDO");
  }
  const ano = Number(encontrado[1]);
  const indice = Number(encontrado[2]) - 1;
  // Meia-noite no horário de Brasília (UTC-3).
  return { inicio: new Date(Date.UTC(ano, indice, 1, 3)), fim: new Date(Date.UTC(ano, indice + 1, 1, 3)) };
}

// Tutor ("Histórico de correções") e Administração ("Histórico geral").
// Para o Tutor, idTutor é sempre o dele (RN13).
export async function historicoDeCorrecoes(filtro: FiltroHistorico) {
  if (filtro.tipoFluxo && filtro.tipoFluxo !== "TREINO" && filtro.tipoFluxo !== "AVALIATIVA") {
    throw new ErroNegocio("Tipo de fluxo inválido. Use TREINO ou AVALIATIVA.", 400, "TIPO_FLUXO_INVALIDO");
  }
  const periodo = filtro.mes ? periodoDoMes(filtro.mes) : undefined;

  const correcoes = await prisma.correcao.findMany({
    where: {
      ...(filtro.idTutor !== undefined ? { idTutor: filtro.idTutor } : {}),
      ...(periodo ? { dataCorrecao: { gte: periodo.inicio, lt: periodo.fim } } : {}),
      versao: {
        redacao: {
          ...(filtro.tipoFluxo ? { tipoFluxo: filtro.tipoFluxo } : {}),
          ...(filtro.idTurma !== undefined ? { aluno: { tutor: { idTurma: filtro.idTurma } } } : {}),
        },
      },
    },
    orderBy: { dataCorrecao: "desc" },
    take: 500,
    include: contextoDaCorrecao,
  });

  return correcoes.map((correcao) => {
    const redacao = correcao.versao.redacao;
    return {
      idCorrecao: correcao.id,
      idRedacao: redacao.id,
      tipoFluxo: redacao.tipoFluxo,
      numeroVersao: correcao.versao.numeroVersao,
      aluno: { id: redacao.idAluno, nome: redacao.aluno.usuario.nome },
      turma: redacao.aluno.tutor.turma,
      tutor: { id: correcao.idTutor, nome: redacao.aluno.tutor.usuario.nome },
      data: correcao.dataCorrecao,
      notaTotal: correcao.notaTotal !== null ? num(correcao.notaTotal) : null,
      statusAprovacao: correcao.statusAprovacao,
      statusRotulo: ROTULO_STATUS[correcao.statusAprovacao] ?? correcao.statusAprovacao,
      ajustes: correcao.numeroAjuste,
    };
  });
}

// ----------------------------------------------------------------- admin

// Tela "Desempenho por Turma" (US33).
export async function desempenhoPorTurma(idTurma?: number) {
  const turmas = await prisma.turma.findMany({
    where: idTurma !== undefined ? { id: idTurma } : { status: { not: "ARQUIVADA" } },
    orderBy: [{ anoLetivo: "desc" }, { nome: "asc" }],
    include: {
      tutores: {
        select: {
          idUsuario: true,
          alunos: {
            select: {
              idUsuario: true,
              redacoes: { select: { versoes: { select: { dataEnvio: true } } } },
            },
          },
        },
      },
    },
  });
  if (idTurma !== undefined && turmas.length === 0) {
    throw new ErroNegocio("Turma não encontrada.", 404, "TURMA_NAO_ENCONTRADA");
  }

  const idsAlunos = turmas.flatMap((turma) =>
    turma.tutores.flatMap((tutor) => tutor.alunos.map((aluno) => aluno.idUsuario))
  );
  const [simulados, correcoes] = await Promise.all([
    carregarSimuladosFinalizados(idsAlunos),
    buscarCorrecoesLiberadas({ versao: { redacao: { idAluno: { in: idsAlunos } } } }),
  ]);

  return turmas.map((turma) => {
    const alunos = turma.tutores.flatMap((tutor) => tutor.alunos);
    const ids = new Set(alunos.map((aluno) => aluno.idUsuario));
    const resumo = resumirSimulados(simulados.filter((simulado) => ids.has(simulado.idAluno)));
    const correcoesDaTurma = correcoes.filter((correcao) => ids.has(correcao.versao.redacao.idAluno));
    const competencias = mediaPorCompetencia(correcoesDaTurma);
    const maisFraca =
      correcoesDaTurma.length > 0
        ? [...competencias].sort((a, b) => a.media - b.media)[0]
        : null;

    return {
      idTurma: turma.id,
      nome: turma.nome,
      anoLetivo: turma.anoLetivo,
      tutores: turma.tutores.length,
      alunos: alunos.length,
      simulados: {
        aplicados: resumo.realizados,
        aproveitamento: resumo.aproveitamentoGeral,
        mediaGeral1000: Math.round(resumo.aproveitamentoGeral * 10),
        faixa: resumo.realizados > 0 ? faixaDeAproveitamento(resumo.aproveitamentoGeral) : null,
      },
      redacoes: {
        enviadas: alunos.reduce(
          (soma, aluno) =>
            soma +
            aluno.redacoes.filter((redacao) => redacao.versoes.some((versao) => versao.dataEnvio !== null)).length,
          0
        ),
        mediaNota: correcoesDaTurma.length ? arredondar(media(correcoesDaTurma.map(notaTotalDe))) : null,
        competenciaMaisFraca: maisFraca,
        mediaPorCompetencia: competencias,
      },
    };
  });
}

// Acompanhamento dos Tutores e seus grupos (US34).
export async function desempenhoPorTutor() {
  const [tutores, porStatus, medias] = await Promise.all([
    prisma.tutor.findMany({
      include: {
        usuario: { select: { nome: true } },
        turma: { select: { id: true, nome: true } },
        _count: { select: { alunos: true } },
      },
    }),
    prisma.correcao.groupBy({ by: ["idTutor", "statusAprovacao"], _count: { _all: true } }),
    prisma.correcao.groupBy({
      by: ["idTutor"],
      where: { statusAprovacao: { in: STATUS_LIBERADA } },
      _avg: { notaTotal: true },
    }),
  ]);

  const contar = (idTutor: number, status?: string) =>
    porStatus
      .filter((linha) => linha.idTutor === idTutor && (status === undefined || linha.statusAprovacao === status))
      .reduce((soma, linha) => soma + linha._count._all, 0);

  return tutores
    .map((tutor) => {
      const mediaDoGrupo = medias.find((linha) => linha.idTutor === tutor.idUsuario)?._avg.notaTotal;
      return {
        idTutor: tutor.idUsuario,
        nome: tutor.usuario.nome,
        turma: tutor.turma,
        tutorados: tutor._count.alunos,
        correcoesRealizadas: contar(tutor.idUsuario),
        aguardandoAprovacao: contar(tutor.idUsuario, "PENDENTE_APROVACAO"),
        ajustesSolicitados: contar(tutor.idUsuario, "AJUSTE_SOLICITADO"),
        mediaNotaGrupo:
          mediaDoGrupo !== null && mediaDoGrupo !== undefined ? arredondar(num(mediaDoGrupo)) : null,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}
