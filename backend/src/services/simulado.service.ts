import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";

const QUESTOES_MIN = 1;
const QUESTOES_MAX = 50;

export interface CriarSimuladoInput {
  quantidade: number;
  vestibular?: string;
  ano?: number;
  grauDificuldade?: string;
  idAssunto?: number;
}

export interface RefazerErrosInput {
  quantidade?: number;
  idAssunto?: number;
  idsCaderno?: number[];
}

const questaoPublica = {
  select: {
    id: true,
    enunciado: true,
    imagemUrl: true,
    vestibular: true,
    ano: true,
    numeroQuestao: true,
    grauDificuldade: true,
    alternativas: {
      select: { id: true, letraOpcao: true, textoAlternativa: true },
    },
    assuntos: { include: { assunto: true } },
  },
} as const;

const simuladoInclude = {
  questoes: {
    orderBy: { ordem: "asc" as const },
    include: { questao: questaoPublica },
  },
} as const;

function embaralhar<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

function prefixoTextoBase(texto: string): string {
  return texto.trim().slice(0, 150).toLowerCase();
}

// RN11: questões com o mesmo texto-base ficam juntas.
function agruparEEmbaralharQuestoes<T extends { id: number; vestibular: string; ano: number; numeroQuestao: number | null; enunciado: string }>(questoes: T[]): T[] {
  const ordenadas = [...questoes].sort((a, b) =>
    a.vestibular.localeCompare(b.vestibular) ||
    a.ano - b.ano ||
    (a.numeroQuestao ?? 0) - (b.numeroQuestao ?? 0)
  );
  const grupos: T[][] = [];
  for (const questao of ordenadas) {
    const grupo = grupos[grupos.length - 1];
    const anterior = grupo?.[grupo.length - 1];
    if (
      anterior &&
      anterior.vestibular === questao.vestibular &&
      anterior.ano === questao.ano &&
      prefixoTextoBase(anterior.enunciado) === prefixoTextoBase(questao.enunciado)
    ) {
      grupo.push(questao);
    } else {
      grupos.push([questao]);
    }
  }
  return embaralhar(grupos).flat();
}

async function obterAluno(idUsuario: number) {
  const aluno = await prisma.aluno.findUnique({ where: { idUsuario } });
  if (!aluno) {
    throw new ErroNegocio(
      "A operação está disponível somente para alunos.",
      403,
      "SEM_PERMISSAO"
    );
  }
  return aluno;
}

// ------------------------------------------------------------------ tempo
// RNF04: todo o tempo é medido pelo relógio do servidor. O cronômetro é
// progressivo (começa em 00:00) e só conta enquanto o simulado está em
// andamento. Ao pausar, o tempo corrido fica guardado em tempoAcumuladoSeg.

interface SimuladoTempo {
  statusSimulado: string;
  dataInicio: Date;
  tempoGastoSeg: number | null;
  tempoAcumuladoSeg: number;
  retomadoEm: Date | null;
}

function tempoDecorridoSeg(simulado: SimuladoTempo, agora: Date = new Date()): number {
  if (simulado.statusSimulado === "FINALIZADO") {
    return simulado.tempoGastoSeg ?? simulado.tempoAcumuladoSeg;
  }
  if (simulado.statusSimulado !== "EM_ANDAMENTO") {
    return simulado.tempoAcumuladoSeg;
  }
  // retomadoEm vazio = simulado iniciado antes desta regra existir.
  const referencia = simulado.retomadoEm ?? simulado.dataInicio;
  const trecho = Math.max(0, Math.floor((agora.getTime() - referencia.getTime()) / 1000));
  return simulado.tempoAcumuladoSeg + trecho;
}

// US25: progresso e cronômetro prontos para a tela do simulado.
function comCronometroEProgresso<T extends SimuladoTempo & { questoes: { respostaAluno: string | null }[] }>(
  simulado: T
) {
  const agora = new Date();
  const total = simulado.questoes.length;
  const respondidas = simulado.questoes.filter((item) => item.respostaAluno !== null).length;
  return {
    ...simulado,
    cronometro: {
      tempoDecorridoSeg: tempoDecorridoSeg(simulado, agora),
      agoraServidor: agora.toISOString(),
    },
    progresso: { total, respondidas, restantes: total - respondidas },
  };
}

// ------------------------------------------------------------- criação

export async function criarSimulado(idUsuario: number, input: CriarSimuladoInput) {
  await obterAluno(idUsuario);
  if (!Number.isInteger(input.quantidade) || input.quantidade < QUESTOES_MIN || input.quantidade > QUESTOES_MAX) {
    throw new ErroNegocio(
      `A quantidade deve estar entre ${QUESTOES_MIN} e ${QUESTOES_MAX}.`,
      400,
      "QUANTIDADE_INVALIDA"
    );
  }

  const vestibular = input.vestibular?.trim().toUpperCase();
  const grauDificuldade = input.grauDificuldade?.trim().toUpperCase();
  const candidatas = await prisma.questao.findMany({
    where: {
      status: "ATIVA", // questões inativas não entram em novos simulados
      ...(vestibular ? { vestibular } : {}),
      ...(input.ano !== undefined ? { ano: input.ano } : {}),
      ...(grauDificuldade ? { grauDificuldade } : {}),
      ...(input.idAssunto
        ? { assuntos: { some: { idAssunto: input.idAssunto } } }
        : {}),
    },
    select: { id: true, vestibular: true, ano: true, numeroQuestao: true, enunciado: true },
  });

  if (candidatas.length === 0) {
    throw new ErroNegocio(
      "Não há questões cadastradas para os filtros escolhidos.",
      409,
      "QUESTOES_INSUFICIENTES"
    );
  }

  // RN11: se pedir mais do que existe, monta com o máximo disponível e avisa.
  const selecionadas = agruparEEmbaralharQuestoes(candidatas).slice(0, input.quantidade);
  const aviso =
    selecionadas.length < input.quantidade
      ? `Havia apenas ${selecionadas.length} questão(ões) para os filtros escolhidos. O simulado foi criado com esse total.`
      : null;

  const simulado = await prisma.simulado.create({
    data: {
      idAluno: idUsuario,
      tipoSimulado: "PERSONALIZADO",
      dataInicio: new Date(),
      statusSimulado: "CRIADO",
      questoes: {
        create: selecionadas.map((questao, index) => ({
          idQuestao: questao.id,
          ordem: index + 1,
        })),
      },
    },
    include: simuladoInclude,
  });
  return {
    ...comCronometroEProgresso(simulado),
    quantidadeSolicitada: input.quantidade,
    aviso,
  };
}

// ------------------------------------------------------------ execução

async function obterSimulado(idUsuario: number, idSimulado: number) {
  const simulado = await prisma.simulado.findUnique({
    where: { id: idSimulado },
    include: simuladoInclude,
  });
  if (!simulado) {
    throw new ErroNegocio("Simulado não encontrado.", 404, "SIMULADO_NAO_ENCONTRADO");
  }
  if (simulado.idAluno !== idUsuario) {
    throw new ErroNegocio("Você não possui acesso a este simulado.", 403, "SEM_PERMISSAO");
  }
  return simulado;
}

// Inicia (CRIADO) ou retoma (PAUSADO). Chamar de novo com o simulado em
// andamento não altera nada: é seguro ao recarregar a página.
export async function iniciarSimulado(idUsuario: number, idSimulado: number) {
  const simulado = await obterSimulado(idUsuario, idSimulado);
  if (simulado.statusSimulado === "EM_ANDAMENTO") {
    return comCronometroEProgresso(simulado);
  }
  if (simulado.statusSimulado !== "CRIADO" && simulado.statusSimulado !== "PAUSADO") {
    throw new ErroNegocio("Este simulado não pode ser iniciado.", 409, "STATUS_INVALIDO");
  }
  const agora = new Date();
  const atualizado = await prisma.simulado.update({
    where: { id: idSimulado },
    data: {
      statusSimulado: "EM_ANDAMENTO",
      retomadoEm: agora,
      ...(simulado.statusSimulado === "CRIADO" ? { dataInicio: agora } : {}),
    },
    include: simuladoInclude,
  });
  return comCronometroEProgresso(atualizado);
}

// RF13: pausa preservando as respostas; o cronômetro para de contar.
export async function pausarSimulado(idUsuario: number, idSimulado: number) {
  const simulado = await obterSimulado(idUsuario, idSimulado);
  if (simulado.statusSimulado !== "EM_ANDAMENTO") {
    throw new ErroNegocio(
      "Somente simulados em andamento podem ser pausados.",
      409,
      "STATUS_INVALIDO"
    );
  }
  const atualizado = await prisma.simulado.update({
    where: { id: idSimulado },
    data: {
      statusSimulado: "PAUSADO",
      tempoAcumuladoSeg: tempoDecorridoSeg(simulado),
      retomadoEm: null,
    },
    include: simuladoInclude,
  });
  return comCronometroEProgresso(atualizado);
}

export async function responderQuestao(
  idUsuario: number,
  idSimulado: number,
  idQuestao: number,
  resposta: string
) {
  const simulado = await obterSimulado(idUsuario, idSimulado);
  if (simulado.statusSimulado !== "EM_ANDAMENTO") {
    throw new ErroNegocio(
      "O simulado não está em andamento. Inicie ou retome o simulado para responder.",
      409,
      "STATUS_INVALIDO"
    );
  }
  const item = simulado.questoes.find((questao) => questao.idQuestao === idQuestao);
  if (!item) {
    throw new ErroNegocio("A questão não pertence a este simulado.", 404, "QUESTAO_NAO_ENCONTRADA");
  }
  const alternativa = resposta.trim().toUpperCase();
  if (!/^[A-Z]$/.test(alternativa)) {
    throw new ErroNegocio("A resposta deve ser uma letra de alternativa.", 400, "RESPOSTA_INVALIDA");
  }
  if (!item.questao.alternativas.some((opcao) => opcao.letraOpcao === alternativa)) {
    throw new ErroNegocio("A alternativa informada não pertence à questão.", 400, "RESPOSTA_INVALIDA");
  }

  const atualizada = await prisma.contemQuestao.update({
    where: { idSimulado_idQuestao: { idSimulado, idQuestao } },
    data: { respostaAluno: alternativa, dataResposta: new Date() },
  });
  const total = simulado.questoes.length;
  const respondidas =
    simulado.questoes.filter((q) => q.respostaAluno !== null && q.idQuestao !== idQuestao).length + 1;
  return { ...atualizada, progresso: { total, respondidas, restantes: total - respondidas } };
}

export async function finalizarSimulado(idUsuario: number, idSimulado: number) {
  const simulado = await obterSimulado(idUsuario, idSimulado);
  if (simulado.statusSimulado !== "EM_ANDAMENTO" && simulado.statusSimulado !== "PAUSADO") {
    throw new ErroNegocio("O simulado não está em andamento.", 409, "STATUS_INVALIDO");
  }

  const fim = new Date();
  const tempoGastoSeg = tempoDecorridoSeg(simulado, fim);
  const gabaritos = await prisma.alternativa.findMany({
    where: {
      idQuestao: { in: simulado.questoes.map((item) => item.idQuestao) },
      alternativaCorreta: true,
    },
    select: { idQuestao: true, letraOpcao: true },
  });
  const gabaritoPorQuestao = new Map(
    gabaritos.map((item) => [item.idQuestao, item.letraOpcao])
  );
  const resultado = simulado.questoes.map((item) => ({
    idQuestao: item.idQuestao,
    respostaAluno: item.respostaAluno,
    acertou:
      item.respostaAluno !== null &&
      item.respostaAluno === gabaritoPorQuestao.get(item.idQuestao),
  }));
  const acertos = resultado.filter((item) => item.acertou).length;
  const ehRevisao = simulado.tipoSimulado === "CADERNO_ERROS";

  await prisma.$transaction(async (tx) => {
    for (const item of resultado) {
      await tx.contemQuestao.update({
        where: { idSimulado_idQuestao: { idSimulado, idQuestao: item.idQuestao } },
        data: { indicadorAcerto: item.acertou },
      });
      if (item.respostaAluno === null) continue; // em branco não é erro

      if (!item.acertou) {
        // RN12: questão errada entra (ou volta) ao caderno de erros.
        await tx.cadernoErros.upsert({
          where: { idAluno_idQuestao: { idAluno: idUsuario, idQuestao: item.idQuestao } },
          create: {
            idAluno: idUsuario,
            idQuestao: item.idQuestao,
            quantidadeErros: 1,
            dataPrimeiroErro: fim,
            dataUltimoErro: fim,
          },
          update: {
            quantidadeErros: { increment: 1 },
            dataUltimoErro: fim,
            statusRevisao: "ATIVO",
          },
        });
      } else if (ehRevisao) {
        // RN12: só sai do caderno quem acerta em um SIMULADO DE REVISÃO.
        // O histórico (quantidade e datas de erro) é preservado.
        await tx.cadernoErros.updateMany({
          where: { idAluno: idUsuario, idQuestao: item.idQuestao, statusRevisao: "ATIVO" },
          data: { statusRevisao: "REVISADO" },
        });
      }
    }
    await tx.simulado.update({
      where: { id: idSimulado },
      data: {
        statusSimulado: "FINALIZADO",
        dataFim: fim,
        tempoGastoSeg,
        tempoAcumuladoSeg: tempoGastoSeg,
        retomadoEm: null,
        pontuacaoTotal: acertos,
      },
    });
  });

  return buscarResultado(idUsuario, idSimulado);
}

export async function listarSimulados(idUsuario: number) {
  await obterAluno(idUsuario);
  return prisma.simulado.findMany({
    where: { idAluno: idUsuario },
    orderBy: { dataInicio: "desc" },
    include: { _count: { select: { questoes: true } } },
  });
}

export async function buscarSimulado(idUsuario: number, idSimulado: number) {
  return comCronometroEProgresso(await obterSimulado(idUsuario, idSimulado));
}

// ------------------------------------------------------------ resultado

// RF14 / US27 / US28: pontuação, gabarito e explicações. O gabarito só é
// liberado depois que o simulado é finalizado.
export async function buscarResultado(idUsuario: number, idSimulado: number) {
  const simulado = await prisma.simulado.findUnique({
    where: { id: idSimulado },
    include: {
      questoes: {
        orderBy: { ordem: "asc" },
        include: {
          questao: {
            include: {
              alternativas: { orderBy: { letraOpcao: "asc" } },
              assuntos: { include: { assunto: true } },
            },
          },
        },
      },
    },
  });
  if (!simulado) {
    throw new ErroNegocio("Simulado não encontrado.", 404, "SIMULADO_NAO_ENCONTRADO");
  }
  if (simulado.idAluno !== idUsuario) {
    throw new ErroNegocio("Você não possui acesso a este simulado.", 403, "SEM_PERMISSAO");
  }
  if (simulado.statusSimulado !== "FINALIZADO") {
    throw new ErroNegocio(
      "O resultado só fica disponível depois de finalizar o simulado.",
      409,
      "SIMULADO_NAO_FINALIZADO"
    );
  }

  const itens = simulado.questoes.map((item) => ({
    ordem: item.ordem,
    idQuestao: item.idQuestao,
    enunciado: item.questao.enunciado,
    imagemUrl: item.questao.imagemUrl,
    vestibular: item.questao.vestibular,
    ano: item.questao.ano,
    numeroQuestao: item.questao.numeroQuestao,
    assuntos: item.questao.assuntos.map((vinculo) => vinculo.assunto),
    alternativas: item.questao.alternativas.map((alternativa) => ({
      letraOpcao: alternativa.letraOpcao,
      textoAlternativa: alternativa.textoAlternativa,
    })),
    respostaAluno: item.respostaAluno,
    respostaCorreta:
      item.questao.alternativas.find((alternativa) => alternativa.alternativaCorreta)?.letraOpcao ?? null,
    respondida: item.respostaAluno !== null,
    acertou: item.indicadorAcerto === true,
    explicacaoGabarito: item.questao.explicacaoGabarito,
  }));

  const total = itens.length;
  const acertos = itens.filter((item) => item.acertou).length;
  const emBranco = itens.filter((item) => !item.respondida).length;
  const percentual = total > 0 ? Math.round((acertos / total) * 1000) / 10 : 0;

  const porAssunto = new Map<number, { idAssunto: number; nomeAssunto: string; total: number; acertos: number }>();
  for (const item of itens) {
    for (const assunto of item.assuntos) {
      const atual = porAssunto.get(assunto.id) ?? {
        idAssunto: assunto.id,
        nomeAssunto: assunto.nomeAssunto,
        total: 0,
        acertos: 0,
      };
      atual.total += 1;
      if (item.acertou) atual.acertos += 1;
      porAssunto.set(assunto.id, atual);
    }
  }

  return {
    idSimulado: simulado.id,
    tipoSimulado: simulado.tipoSimulado,
    dataInicio: simulado.dataInicio,
    dataFim: simulado.dataFim,
    tempoGastoSeg: simulado.tempoGastoSeg,
    resumo: {
      total,
      acertos,
      erros: total - acertos - emBranco,
      emBranco,
      percentual,
    },
    desempenhoPorAssunto: [...porAssunto.values()].map((assunto) => ({
      ...assunto,
      percentual: Math.round((assunto.acertos / assunto.total) * 1000) / 10,
    })),
    itens,
  };
}

// -------------------------------------------------------- caderno de erros

// Só aparecem erros ATIVOS. US30: pode filtrar por assunto.
export async function listarCadernoErros(idUsuario: number, idAssunto?: number) {
  await obterAluno(idUsuario);
  return prisma.cadernoErros.findMany({
    where: {
      idAluno: idUsuario,
      statusRevisao: "ATIVO",
      ...(idAssunto ? { questao: { assuntos: { some: { idAssunto } } } } : {}),
    },
    orderBy: { dataUltimoErro: "desc" },
    include: { questao: questaoPublica },
  });
}

// RF15 / US30: simulado de revisão com os erros ativos do aluno, todos,
// de um assunto ou itens específicos escolhidos (idsCaderno).
export async function criarSimuladoDoCaderno(idUsuario: number, opcoes: RefazerErrosInput) {
  await obterAluno(idUsuario);
  const ids = [...new Set(opcoes.idsCaderno ?? [])];

  const erros = await prisma.cadernoErros.findMany({
    where: {
      idAluno: idUsuario,
      statusRevisao: "ATIVO",
      ...(ids.length ? { id: { in: ids } } : {}),
      questao: {
        status: "ATIVA",
        ...(opcoes.idAssunto ? { assuntos: { some: { idAssunto: opcoes.idAssunto } } } : {}),
      },
    },
    orderBy: [{ quantidadeErros: "desc" }, { dataUltimoErro: "desc" }],
    include: {
      questao: {
        select: { id: true, vestibular: true, ano: true, numeroQuestao: true, enunciado: true },
      },
    },
  });
  if (ids.length > 0 && erros.length !== ids.length) {
    throw new ErroNegocio(
      "Um ou mais itens do caderno não foram encontrados ou já foram revisados.",
      404,
      "ERRO_NAO_ENCONTRADO"
    );
  }
  const escolhidos = erros.slice(0, opcoes.quantidade ?? QUESTOES_MAX);
  if (escolhidos.length === 0) {
    throw new ErroNegocio("Não há erros ativos no caderno para este filtro.", 409, "CADERNO_VAZIO");
  }

  const ordenadas = agruparEEmbaralharQuestoes(escolhidos.map((item) => item.questao));
  const simulado = await prisma.simulado.create({
    data: {
      idAluno: idUsuario,
      tipoSimulado: "CADERNO_ERROS",
      dataInicio: new Date(),
      statusSimulado: "CRIADO",
      questoes: {
        create: ordenadas.map((questao, index) => ({ idQuestao: questao.id, ordem: index + 1 })),
      },
    },
    include: simuladoInclude,
  });
  return comCronometroEProgresso(simulado);
}
