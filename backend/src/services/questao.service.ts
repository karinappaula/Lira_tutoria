import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import { urlCloudinaryValida } from "../utils/cloudinary";
import { registrarAuditoria } from "./auditoria.service";
import type { PapelAtivo } from "./token.service";

// RN10 / DEC-021: escopo inicial do banco de questões.
export const VESTIBULARES = ["ENEM", "FUVEST", "UNICAMP"];
// Mesmos valores usados na migração das questões do Firebase.
export const DIFICULDADES = ["FACIL", "MEDIA", "DIFICIL"];
export const STATUS_QUESTAO = ["ATIVA", "INATIVA"];
const LETRAS = ["A", "B", "C", "D", "E"];

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
  select: { id: true, letraOpcao: true, textoAlternativa: true },
} as const;

const questaoDetalhe = {
  alternativas: { orderBy: { letraOpcao: "asc" as const } },
  assuntos: { include: { assunto: true } },
} as const;

function dadosInvalidos(mensagem: string, codigo = "DADOS_INVALIDOS"): never {
  throw new ErroNegocio(mensagem, 400, codigo);
}

// ---------------------------------------------------------------- listagem

// Administração enxerga tudo (inclusive inativas e a explicação).
// Tutor e aluno enxergam só questões ativas, sem gabarito nem explicação:
// a explicação é mostrada depois da finalização do simulado (RF14).
export async function listarQuestoes(filtro: FiltroQuestoes, papelAtivo: PapelAtivo) {
  const pagina = filtro.pagina ?? 1;
  const limite = filtro.limite ?? 20;
  if (!Number.isInteger(pagina) || pagina < 1) {
    dadosInvalidos("A página deve ser um inteiro a partir de 1.", "PAGINA_INVALIDA");
  }
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    dadosInvalidos("O limite deve estar entre 1 e 100.", "LIMITE_INVALIDO");
  }

  const admin = papelAtivo === "ADMINISTRADOR";
  const status = filtro.status?.trim().toUpperCase();
  if (admin && status && !STATUS_QUESTAO.includes(status)) {
    dadosInvalidos("Status inválido. Use ATIVA ou INATIVA.", "STATUS_INVALIDO");
  }

  const where: Prisma.QuestaoWhereInput = {
    status: admin ? status : "ATIVA",
    ...(filtro.vestibular ? { vestibular: filtro.vestibular.trim().toUpperCase() } : {}),
    ...(filtro.ano !== undefined ? { ano: filtro.ano } : {}),
    ...(filtro.grauDificuldade ? { grauDificuldade: filtro.grauDificuldade.trim().toUpperCase() } : {}),
    ...(filtro.idAssunto ? { assuntos: { some: { idAssunto: filtro.idAssunto } } } : {}),
    ...(filtro.busca ? { enunciado: { contains: filtro.busca.trim() } } : {}),
  };
  const ordem: Prisma.QuestaoOrderByWithRelationInput[] = [
    { ano: "desc" },
    { numeroQuestao: "desc" },
    { id: "desc" },
  ];
  const paginacao = { skip: (pagina - 1) * limite, take: limite };

  const total = await prisma.questao.count({ where });
  const itens = admin
    ? await prisma.questao.findMany({
        where,
        orderBy: ordem,
        ...paginacao,
        include: { alternativas: alternativasPublicas, assuntos: { include: { assunto: true } } },
      })
    : await prisma.questao.findMany({
        where,
        orderBy: ordem,
        ...paginacao,
        select: {
          id: true,
          enunciado: true,
          imagemUrl: true,
          vestibular: true,
          ano: true,
          numeroQuestao: true,
          grauDificuldade: true,
          alternativas: alternativasPublicas,
          assuntos: { include: { assunto: true } },
        },
      });

  return { total, pagina, limite, totalPaginas: Math.ceil(total / limite), itens };
}

export async function buscarQuestao(idQuestao: number) {
  const questao = await prisma.questao.findUnique({ where: { id: idQuestao }, include: questaoDetalhe });
  if (!questao) throw new ErroNegocio("Questão não encontrada.", 404, "QUESTAO_NAO_ENCONTRADA");
  return questao;
}

// ----------------------------------------------------------------- assuntos

export async function listarAssuntos() {
  return prisma.assunto.findMany({
    orderBy: { nomeAssunto: "asc" },
    include: { _count: { select: { questoes: true } } },
  });
}

function validarNomeAssunto(nome: string) {
  const limpo = nome.trim();
  if (!limpo || limpo.length > 150) {
    dadosInvalidos("O nome do assunto deve ter de 1 a 150 caracteres.", "ASSUNTO_INVALIDO");
  }
  return limpo;
}

async function exigirNomeLivre(nome: string, ignorarId?: number) {
  const existente = await prisma.assunto.findFirst({ where: { nomeAssunto: nome } });
  if (existente && existente.id !== ignorarId) {
    throw new ErroNegocio("Já existe um assunto com esse nome.", 409, "ASSUNTO_DUPLICADO");
  }
}

export async function criarAssunto(idUsuario: number, nome: string) {
  const nomeAssunto = validarNomeAssunto(nome);
  await exigirNomeLivre(nomeAssunto);
  return prisma.$transaction(async (tx) => {
    const assunto = await tx.assunto.create({ data: { nomeAssunto } });
    await registrarAuditoria(
      { idUsuario, acao: "ASSUNTO_CRIADO", entidade: "ASSUNTO", idRegistro: assunto.id },
      tx
    );
    return assunto;
  });
}

async function obterAssunto(idAssunto: number) {
  const assunto = await prisma.assunto.findUnique({
    where: { id: idAssunto },
    include: { _count: { select: { questoes: true } } },
  });
  if (!assunto) throw new ErroNegocio("Assunto não encontrado.", 404, "ASSUNTO_NAO_ENCONTRADO");
  return assunto;
}

export async function atualizarAssunto(idUsuario: number, idAssunto: number, nome: string) {
  await obterAssunto(idAssunto);
  const nomeAssunto = validarNomeAssunto(nome);
  await exigirNomeLivre(nomeAssunto, idAssunto);
  return prisma.$transaction(async (tx) => {
    const assunto = await tx.assunto.update({ where: { id: idAssunto }, data: { nomeAssunto } });
    await registrarAuditoria(
      { idUsuario, acao: "ASSUNTO_ATUALIZADO", entidade: "ASSUNTO", idRegistro: idAssunto },
      tx
    );
    return assunto;
  });
}

export async function excluirAssunto(idUsuario: number, idAssunto: number) {
  const assunto = await obterAssunto(idAssunto);
  if (assunto._count.questoes > 0) {
    throw new ErroNegocio(
      "Não é possível excluir um assunto vinculado a questões.",
      409,
      "ASSUNTO_EM_USO"
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.assunto.delete({ where: { id: idAssunto } });
    await registrarAuditoria(
      { idUsuario, acao: "ASSUNTO_EXCLUIDO", entidade: "ASSUNTO", idRegistro: idAssunto },
      tx
    );
  });
}

// ----------------------------------------------------------------- questões

// Valida e normaliza. As alternativas ficam sempre em maiúsculas e aparadas.
function normalizarQuestao(input: CriarQuestaoInput) {
  const enunciado = input.enunciado.trim();
  if (!enunciado || enunciado.length > 20000) {
    dadosInvalidos("O enunciado é obrigatório (até 20000 caracteres).");
  }

  const vestibular = input.vestibular.trim().toUpperCase();
  if (!VESTIBULARES.includes(vestibular)) {
    dadosInvalidos("Vestibular inválido. Use ENEM, FUVEST ou UNICAMP.", "VESTIBULAR_INVALIDO");
  }

  const grauDificuldade = input.grauDificuldade.trim().toUpperCase();
  if (!DIFICULDADES.includes(grauDificuldade)) {
    dadosInvalidos("Dificuldade inválida. Use FACIL, MEDIA ou DIFICIL.", "DIFICULDADE_INVALIDA");
  }

  const anoMaximo = new Date().getFullYear() + 1;
  if (!Number.isInteger(input.ano) || input.ano < 1900 || input.ano > anoMaximo) {
    dadosInvalidos(`Informe um ano entre 1900 e ${anoMaximo}.`);
  }
  if (
    input.numeroQuestao !== undefined &&
    (!Number.isInteger(input.numeroQuestao) || input.numeroQuestao < 1 || input.numeroQuestao > 999)
  ) {
    dadosInvalidos("O número da questão deve ser um inteiro de 1 a 999.");
  }

  const explicacaoGabarito = input.explicacaoGabarito?.trim() || undefined;
  if (explicacaoGabarito && explicacaoGabarito.length > 10000) {
    dadosInvalidos("A explicação deve ter até 10000 caracteres.");
  }

  const imagemUrl = input.imagemUrl?.trim() || undefined;
  if (imagemUrl && (imagemUrl.length > 500 || !urlCloudinaryValida(imagemUrl))) {
    dadosInvalidos("A imagem deve estar hospedada no Cloudinary do projeto.", "IMAGEM_URL_INVALIDA");
  }

  const alternativas = input.alternativas.map((item) => ({
    letraOpcao: item.letraOpcao.trim().toUpperCase(),
    textoAlternativa: item.textoAlternativa.trim(),
    alternativaCorreta: item.alternativaCorreta,
  }));
  const letras = alternativas.map((item) => item.letraOpcao);
  if (letras.length !== 5 || new Set(letras).size !== 5 || !LETRAS.every((letra) => letras.includes(letra))) {
    dadosInvalidos("Informe exatamente as alternativas A, B, C, D e E.", "ALTERNATIVAS_INVALIDAS");
  }
  if (alternativas.some((item) => !item.textoAlternativa || item.textoAlternativa.length > 5000)) {
    dadosInvalidos("Todas as alternativas devem ter texto (até 5000 caracteres).", "ALTERNATIVAS_INVALIDAS");
  }
  if (alternativas.filter((item) => item.alternativaCorreta).length !== 1) {
    dadosInvalidos("Informe exatamente uma alternativa correta.", "GABARITO_INVALIDO");
  }

  const idAssuntos = [...new Set(input.idAssuntos)];
  if (idAssuntos.length === 0) {
    dadosInvalidos("Informe pelo menos um assunto.", "ASSUNTO_OBRIGATORIO");
  }

  return {
    enunciado,
    imagemUrl,
    vestibular,
    ano: input.ano,
    numeroQuestao: input.numeroQuestao,
    grauDificuldade,
    explicacaoGabarito,
    alternativas,
    idAssuntos,
  };
}

async function validarAssuntos(idAssuntos: number[]) {
  const assuntos = await prisma.assunto.findMany({
    where: { id: { in: idAssuntos } },
    select: { id: true },
  });
  if (assuntos.length !== idAssuntos.length) {
    throw new ErroNegocio("Um ou mais assuntos não foram encontrados.", 404, "ASSUNTO_NAO_ENCONTRADO");
  }
}

export async function criarQuestao(idUsuario: number, input: CriarQuestaoInput) {
  const dados = normalizarQuestao(input);
  await validarAssuntos(dados.idAssuntos);

  return prisma.$transaction(async (tx) => {
    const questao = await tx.questao.create({
      data: {
        enunciado: dados.enunciado,
        imagemUrl: dados.imagemUrl,
        vestibular: dados.vestibular,
        ano: dados.ano,
        numeroQuestao: dados.numeroQuestao,
        grauDificuldade: dados.grauDificuldade,
        explicacaoGabarito: dados.explicacaoGabarito,
        criadoPor: idUsuario,
        alternativas: { create: dados.alternativas },
        assuntos: { create: dados.idAssuntos.map((idAssunto) => ({ idAssunto })) },
      },
      include: questaoDetalhe,
    });
    await registrarAuditoria(
      { idUsuario, acao: "QUESTAO_CRIADA", entidade: "QUESTAO", idRegistro: questao.id },
      tx
    );
    return questao;
  });
}

// Substitui os dados completos da questão (alternativas e assuntos inclusive).
export async function atualizarQuestao(idUsuario: number, idQuestao: number, input: CriarQuestaoInput) {
  const dados = normalizarQuestao(input);
  await validarAssuntos(dados.idAssuntos);
  await buscarQuestao(idQuestao);

  return prisma.$transaction(async (tx) => {
    await tx.alternativa.deleteMany({ where: { idQuestao } });
    await tx.questaoAssunto.deleteMany({ where: { idQuestao } });
    const questao = await tx.questao.update({
      where: { id: idQuestao },
      data: {
        enunciado: dados.enunciado,
        imagemUrl: dados.imagemUrl ?? null,
        vestibular: dados.vestibular,
        ano: dados.ano,
        numeroQuestao: dados.numeroQuestao ?? null,
        grauDificuldade: dados.grauDificuldade,
        explicacaoGabarito: dados.explicacaoGabarito ?? null,
        alternativas: { create: dados.alternativas },
        assuntos: { create: dados.idAssuntos.map((idAssunto) => ({ idAssunto })) },
      },
      include: questaoDetalhe,
    });
    await registrarAuditoria(
      { idUsuario, acao: "QUESTAO_ATUALIZADA", entidade: "QUESTAO", idRegistro: idQuestao },
      tx
    );
    return questao;
  });
}

// Questão já usada em simulado ou caderno não é excluída para preservar o
// histórico dos alunos. Nesse caso, a Administração a inativa.
export async function excluirQuestao(idUsuario: number, idQuestao: number) {
  await buscarQuestao(idQuestao);
  const [usoSimulado, usoCaderno] = await Promise.all([
    prisma.contemQuestao.count({ where: { idQuestao } }),
    prisma.cadernoErros.count({ where: { idQuestao } }),
  ]);
  if (usoSimulado || usoCaderno) {
    throw new ErroNegocio(
      "A questão já foi usada por alunos e não pode ser excluída. Inative a questão para retirá-la dos novos simulados.",
      409,
      "QUESTAO_EM_USO"
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.questao.delete({ where: { id: idQuestao } });
    await registrarAuditoria(
      { idUsuario, acao: "QUESTAO_EXCLUIDA", entidade: "QUESTAO", idRegistro: idQuestao },
      tx
    );
  });
}

// Inativar tira a questão dos novos simulados, sem apagar o histórico.
export async function alterarStatusQuestao(
  idUsuario: number,
  idQuestao: number,
  status: "ATIVA" | "INATIVA"
) {
  await buscarQuestao(idQuestao);
  return prisma.$transaction(async (tx) => {
    const questao = await tx.questao.update({
      where: { id: idQuestao },
      data: { status },
      include: questaoDetalhe,
    });
    await registrarAuditoria(
      {
        idUsuario,
        acao: status === "INATIVA" ? "QUESTAO_INATIVADA" : "QUESTAO_ATIVADA",
        entidade: "QUESTAO",
        idRegistro: idQuestao,
      },
      tx
    );
    return questao;
  });
}


export async function listarAnosCadastrados(): Promise<number[]> {
  const registros = await prisma.questao.findMany({
    select: { ano: true },
    distinct: ["ano"],
    orderBy: { ano: "desc" },
  });
  return registros.map((r) => r.ano);
}
