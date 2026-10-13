import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";

export interface FiltroQuestoes {
  vestibular?: string;
  ano?: number;
  grauDificuldade?: string;
  idAssunto?: number;
  limite?: number;
}

export interface AlternativaInput {
  letraOpcao: string;
  textoAlternativa: string;
  alternativaCorreta: boolean;
}

export interface CriarQuestaoInput {
  enunciado: string;
  imagemUrl?: string;
  vestibular: string;
  ano: number;
  numeroQuestao?: number;
  grauDificuldade: string;
  explicacaoGabarito?: string;
  idAssuntos: number[];
  alternativas: AlternativaInput[];
}

const alternativasPublicas = {
  select: {
    id: true,
    letraOpcao: true,
    textoAlternativa: true,
  },
} as const;

export async function listarQuestoes(filtro: FiltroQuestoes) {
  const limite = filtro.limite ?? 50;
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    throw new ErroNegocio("O limite deve estar entre 1 e 100.", 400, "LIMITE_INVALIDO");
  }

  return prisma.questao.findMany({
    where: {
      ...(filtro.vestibular ? { vestibular: filtro.vestibular } : {}),
      ...(filtro.ano !== undefined ? { ano: filtro.ano } : {}),
      ...(filtro.grauDificuldade ? { grauDificuldade: filtro.grauDificuldade } : {}),
      ...(filtro.idAssunto
        ? { assuntos: { some: { idAssunto: filtro.idAssunto } } }
        : {}),
    },
    orderBy: { id: "asc" },
    take: limite,
    include: {
      alternativas: alternativasPublicas,
      assuntos: { include: { assunto: true } },
    },
  });
}

export async function listarAssuntos() {
  return prisma.assunto.findMany({
    orderBy: { nomeAssunto: "asc" },
    include: { _count: { select: { questoes: true } } },
  });
}

const questaoDetalhe = {
  alternativas: { orderBy: { letraOpcao: "asc" as const } },
  assuntos: { include: { assunto: true } },
} as const;

function validarQuestaoInput(input: CriarQuestaoInput) {
  if (!input.enunciado.trim()) throw new ErroNegocio("O enunciado é obrigatório.", 400, "DADOS_INVALIDOS");
  if (!Number.isInteger(input.ano) || input.ano < 1900) {
    throw new ErroNegocio("Informe um ano válido.", 400, "DADOS_INVALIDOS");
  }
  const letras = input.alternativas.map((item) => item.letraOpcao.trim().toUpperCase());
  if (letras.length !== 5 || new Set(letras).size !== 5 || !["A", "B", "C", "D", "E"].every((letra) => letras.includes(letra))) {
    throw new ErroNegocio("Informe exatamente as alternativas A, B, C, D e E.", 400, "ALTERNATIVAS_INVALIDAS");
  }
  if (input.alternativas.filter((item) => item.alternativaCorreta).length !== 1) {
    throw new ErroNegocio("Informe exatamente uma alternativa correta.", 400, "GABARITO_INVALIDO");
  }
  if (input.idAssuntos.length === 0) {
    throw new ErroNegocio("Informe pelo menos um assunto.", 400, "ASSUNTO_OBRIGATORIO");
  }
  if (input.alternativas.some((item) => !item.textoAlternativa.trim())) {
    throw new ErroNegocio("Todas as alternativas devem possuir texto.", 400, "ALTERNATIVAS_INVALIDAS");
  }
}

async function validarAssuntos(idAssuntos: number[]) {
  const assuntos = await prisma.assunto.findMany({ where: { id: { in: idAssuntos } }, select: { id: true } });
  if (assuntos.length !== new Set(idAssuntos).size) {
    throw new ErroNegocio("Um ou mais assuntos não foram encontrados.", 404, "ASSUNTO_NAO_ENCONTRADO");
  }
}

export async function buscarQuestao(idQuestao: number) {
  const questao = await prisma.questao.findUnique({ where: { id: idQuestao }, include: questaoDetalhe });
  if (!questao) throw new ErroNegocio("Questão não encontrada.", 404, "QUESTAO_NAO_ENCONTRADA");
  return questao;
}

export async function criarQuestao(idUsuario: number, input: CriarQuestaoInput) {
  validarQuestaoInput(input);
  await validarAssuntos(input.idAssuntos);
  return prisma.questao.create({
    data: {
      enunciado: input.enunciado.trim(),
      imagemUrl: input.imagemUrl?.trim() || undefined,
      vestibular: input.vestibular.trim().toUpperCase(),
      ano: input.ano,
      numeroQuestao: input.numeroQuestao,
      grauDificuldade: input.grauDificuldade.trim().toUpperCase(),
      explicacaoGabarito: input.explicacaoGabarito?.trim() || undefined,
      criadoPor: idUsuario,
      alternativas: { create: input.alternativas.map((item) => ({ ...item, letraOpcao: item.letraOpcao.trim().toUpperCase(), textoAlternativa: item.textoAlternativa.trim() })) },
      assuntos: { create: input.idAssuntos.map((idAssunto) => ({ assunto: { connect: { id: idAssunto } } })) },
    },
    include: questaoDetalhe,
  });
}

export async function atualizarQuestao(idQuestao: number, input: CriarQuestaoInput) {
  validarQuestaoInput(input);
  await validarAssuntos(input.idAssuntos);
  await buscarQuestao(idQuestao);
  return prisma.$transaction(async (tx) => {
    await tx.alternativa.deleteMany({ where: { idQuestao } });
    await tx.questaoAssunto.deleteMany({ where: { idQuestao } });
    return tx.questao.update({
      where: { id: idQuestao },
      data: {
        enunciado: input.enunciado.trim(),
        imagemUrl: input.imagemUrl?.trim() || null,
        vestibular: input.vestibular.trim().toUpperCase(),
        ano: input.ano,
        numeroQuestao: input.numeroQuestao,
        grauDificuldade: input.grauDificuldade.trim().toUpperCase(),
        explicacaoGabarito: input.explicacaoGabarito?.trim() || null,
        alternativas: { create: input.alternativas.map((item) => ({ ...item, letraOpcao: item.letraOpcao.trim().toUpperCase(), textoAlternativa: item.textoAlternativa.trim() })) },
        assuntos: { create: input.idAssuntos.map((idAssunto) => ({ idAssunto })) },
      },
      include: questaoDetalhe,
    });
  });
}

export async function excluirQuestao(idQuestao: number) {
  await buscarQuestao(idQuestao);
  const [usoSimulado, usoCaderno] = await Promise.all([
    prisma.contemQuestao.count({ where: { idQuestao } }),
    prisma.cadernoErros.count({ where: { idQuestao } }),
  ]);
  if (usoSimulado || usoCaderno) {
    throw new ErroNegocio("A questão já foi usada e não pode ser removida.", 409, "QUESTAO_EM_USO");
  }
  await prisma.questao.delete({ where: { id: idQuestao } });
}
