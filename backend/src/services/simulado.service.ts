import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";

const DURACAO_PADRAO_SEGUNDOS = 60 * 60;
const QUESTOES_MIN = 1;
const QUESTOES_MAX = 50;

export interface CriarSimuladoInput {
  tipoSimulado: string;
  quantidade: number;
  vestibular?: string;
  ano?: number;
  grauDificuldade?: string;
  idAssunto?: number;
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

function embaralhar<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
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

export async function criarSimulado(idUsuario: number, input: CriarSimuladoInput) {
  await obterAluno(idUsuario);
  if (!Number.isInteger(input.quantidade) || input.quantidade < QUESTOES_MIN || input.quantidade > QUESTOES_MAX) {
    throw new ErroNegocio(
      `A quantidade deve estar entre ${QUESTOES_MIN} e ${QUESTOES_MAX}.`,
      400,
      "QUANTIDADE_INVALIDA"
    );
  }

  const candidatas = await prisma.questao.findMany({
    where: {
      ...(input.vestibular ? { vestibular: input.vestibular } : {}),
      ...(input.ano !== undefined ? { ano: input.ano } : {}),
      ...(input.grauDificuldade ? { grauDificuldade: input.grauDificuldade } : {}),
      ...(input.idAssunto
        ? { assuntos: { some: { idAssunto: input.idAssunto } } }
        : {}),
    },
    select: { id: true },
  });

  if (candidatas.length < input.quantidade) {
    throw new ErroNegocio(
      `Não há questões suficientes para este filtro. Disponíveis: ${candidatas.length}.`,
      409,
      "QUESTOES_INSUFICIENTES"
    );
  }

  const selecionadas = embaralhar(candidatas).slice(0, input.quantidade);
  return prisma.simulado.create({
    data: {
      idAluno: idUsuario,
      tipoSimulado: input.tipoSimulado,
      dataInicio: new Date(),
      statusSimulado: "CRIADO",
      questoes: {
        create: selecionadas.map((questao, index) => ({
          idQuestao: questao.id,
          ordem: index + 1,
        })),
      },
    },
    include: {
      questoes: {
        orderBy: { ordem: "asc" },
        include: { questao: questaoPublica },
      },
    },
  });
}

export async function iniciarSimulado(idUsuario: number, idSimulado: number) {
  const simulado = await obterSimulado(idUsuario, idSimulado);
  if (simulado.statusSimulado !== "CRIADO" && simulado.statusSimulado !== "EM_ANDAMENTO") {
    throw new ErroNegocio("Este simulado não pode ser iniciado.", 409, "STATUS_INVALIDO");
  }
  return prisma.simulado.update({
    where: { id: idSimulado },
    data: {
      statusSimulado: "EM_ANDAMENTO",
      dataInicio: simulado.statusSimulado === "CRIADO" ? new Date() : undefined,
    },
    include: {
      questoes: {
        orderBy: { ordem: "asc" },
        include: { questao: questaoPublica },
      },
    },
  });
}

async function obterSimulado(idUsuario: number, idSimulado: number) {
  const simulado = await prisma.simulado.findUnique({
    where: { id: idSimulado },
    include: {
      questoes: {
        orderBy: { ordem: "asc" },
        include: { questao: questaoPublica },
      },
    },
  });
  if (!simulado) {
    throw new ErroNegocio("Simulado não encontrado.", 404, "SIMULADO_NAO_ENCONTRADO");
  }
  if (simulado.idAluno !== idUsuario) {
    throw new ErroNegocio("Você não possui acesso a este simulado.", 403, "SEM_PERMISSAO");
  }
  return simulado;
}

function simuladoExpirou(dataInicio: Date): boolean {
  return Date.now() - dataInicio.getTime() > DURACAO_PADRAO_SEGUNDOS * 1000;
}

export async function responderQuestao(
  idUsuario: number,
  idSimulado: number,
  idQuestao: number,
  resposta: string
) {
  const simulado = await obterSimulado(idUsuario, idSimulado);
  if (simulado.statusSimulado !== "EM_ANDAMENTO") {
    throw new ErroNegocio("O simulado não está em andamento.", 409, "STATUS_INVALIDO");
  }
  if (simuladoExpirou(simulado.dataInicio)) {
    throw new ErroNegocio("O tempo do simulado terminou.", 409, "TEMPO_ESGOTADO");
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

  return prisma.contemQuestao.update({
    where: { idSimulado_idQuestao: { idSimulado, idQuestao } },
    data: { respostaAluno: alternativa, dataResposta: new Date() },
  });
}

export async function finalizarSimulado(idUsuario: number, idSimulado: number) {
  const simulado = await obterSimulado(idUsuario, idSimulado);
  if (simulado.statusSimulado !== "EM_ANDAMENTO") {
    throw new ErroNegocio("O simulado não está em andamento.", 409, "STATUS_INVALIDO");
  }

  const fim = new Date();
  const tempoGastoSeg = Math.max(0, Math.floor((fim.getTime() - simulado.dataInicio.getTime()) / 1000));
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
    ...item,
    acertou:
      item.respostaAluno !== null &&
      item.respostaAluno === gabaritoPorQuestao.get(item.idQuestao),
  }));
  const acertos = resultado.filter((item) => item.acertou).length;

  return prisma.$transaction(async (tx) => {
    for (const item of resultado) {
      await tx.contemQuestao.update({
        where: { idSimulado_idQuestao: { idSimulado, idQuestao: item.idQuestao } },
        data: { indicadorAcerto: item.acertou },
      });
      if (!item.acertou && item.respostaAluno) {
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
      }
    }
    return tx.simulado.update({
      where: { id: idSimulado },
      data: {
        statusSimulado: "FINALIZADO",
        dataFim: fim,
        tempoGastoSeg,
        pontuacaoTotal: acertos,
      },
      include: { questoes: { orderBy: { ordem: "asc" }, include: { questao: questaoPublica } } },
    });
  });
}

export async function listarSimulados(idUsuario: number) {
  await obterAluno(idUsuario);
  return prisma.simulado.findMany({
    where: { idAluno: idUsuario },
    orderBy: { dataInicio: "desc" },
    include: { _count: { select: { questoes: true } } },
  });
}

export async function listarCadernoErros(idUsuario: number) {
  await obterAluno(idUsuario);
  return prisma.cadernoErros.findMany({
    where: { idAluno: idUsuario, statusRevisao: "ATIVO" },
    orderBy: { dataUltimoErro: "desc" },
    include: { questao: questaoPublica },
  });
}

export async function revisarErro(idUsuario: number, idCaderno: number) {
  const erro = await prisma.cadernoErros.findUnique({ where: { id: idCaderno } });
  if (!erro) throw new ErroNegocio("Registro do caderno não encontrado.", 404, "ERRO_NAO_ENCONTRADO");
  if (erro.idAluno !== idUsuario) throw new ErroNegocio("Você não possui acesso a este registro.", 403, "SEM_PERMISSAO");
  return prisma.cadernoErros.update({
    where: { id: idCaderno },
    data: { statusRevisao: "REVISADO" },
    include: { questao: questaoPublica },
  });
}
