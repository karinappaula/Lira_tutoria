import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";

export interface AnotacaoInput {
  posicaoInicio: number;
  posicaoFinal: number;
  textoSelecionado: string;
  tipoErro: string;
  sugestaoComentario?: string;
}

export interface CriarCorrecaoInput {
  idVersao: number;
  notaComp1: number;
  notaComp2: number;
  notaComp3: number;
  notaComp4: number;
  notaComp5: number;
  parecerGeral?: string;
  anotacoes?: AnotacaoInput[];
}

const correcaoInclude = {
  versao: {
    include: {
      redacao: {
        include: {
          aluno: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
          tarefa: { select: { id: true, modalidade: true, prazoEntrega: true } },
        },
      },
    },
  },
  tutor: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
  administrador: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
  anotacoes: true,
} as const;

function validarNota(valor: number, campo: string) {
  if (!Number.isFinite(valor) || valor < 0 || valor > 200 || valor % 10 !== 0) {
    throw new ErroNegocio(
      `${campo} deve estar entre 0 e 200, em incrementos de 10.`,
      400,
      "NOTA_INVALIDA"
    );
  }
}

function validarAnotacoes(anotacoes: AnotacaoInput[] | undefined, texto: string) {
  for (const anotacao of anotacoes ?? []) {
    if (
      !Number.isInteger(anotacao.posicaoInicio) ||
      !Number.isInteger(anotacao.posicaoFinal) ||
      anotacao.posicaoInicio < 0 ||
      anotacao.posicaoFinal <= anotacao.posicaoInicio ||
      anotacao.posicaoFinal > texto.length
    ) {
      throw new ErroNegocio(
        "As posições da anotação não correspondem ao texto da versão.",
        400,
        "ANOTACAO_INVALIDA"
      );
    }
    if (texto.slice(anotacao.posicaoInicio, anotacao.posicaoFinal) !== anotacao.textoSelecionado) {
      throw new ErroNegocio(
        "O trecho selecionado da anotação não corresponde ao texto informado.",
        400,
        "ANOTACAO_INVALIDA"
      );
    }
    if (!anotacao.tipoErro.trim()) {
      throw new ErroNegocio("O tipo do erro da anotação é obrigatório.", 400, "ANOTACAO_INVALIDA");
    }
  }
}

async function obterVersao(idVersao: number) {
  const versao = await prisma.versaoRedacao.findUnique({
    where: { id: idVersao },
    include: {
      redacao: {
        include: {
          aluno: { include: { tutor: true } },
          tarefa: true,
        },
      },
      correcoes: { orderBy: { numeroAjuste: "desc" }, take: 1 },
    },
  });
  if (!versao) {
    throw new ErroNegocio("Versão da redação não encontrada.", 404, "VERSAO_NAO_ENCONTRADA");
  }
  return versao;
}

async function exigirTutorDaRedacao(idUsuarioTutor: number, idVersao: number) {
  const versao = await obterVersao(idVersao);
  if (versao.redacao.aluno.tutor.idUsuario !== idUsuarioTutor) {
    throw new ErroNegocio("Você não possui acesso a esta redação.", 403, "SEM_PERMISSAO");
  }
  return versao;
}

export async function criarCorrecao(idUsuarioTutor: number, input: CriarCorrecaoInput) {
  const versao = await exigirTutorDaRedacao(idUsuarioTutor, input.idVersao);
  if (versao.statusVersao !== "ENVIADA" && versao.statusVersao !== "AJUSTE_SOLICITADO") {
    throw new ErroNegocio(
      "A versão não está disponível para correção.",
      409,
      "VERSAO_INDISPONIVEL"
    );
  }

  const notas = [input.notaComp1, input.notaComp2, input.notaComp3, input.notaComp4, input.notaComp5];
  notas.forEach((nota, index) => validarNota(nota, `notaComp${index + 1}`));
  validarAnotacoes(input.anotacoes, versao.conteudoTexto);

  const numeroAjuste = (versao.correcoes[0]?.numeroAjuste ?? -1) + 1;
  return prisma.$transaction(async (tx) => {
    const correcao = await tx.correcao.create({
      data: {
        idVersao: input.idVersao,
        idTutor: idUsuarioTutor,
        numeroAjuste,
        notaComp1: input.notaComp1,
        notaComp2: input.notaComp2,
        notaComp3: input.notaComp3,
        notaComp4: input.notaComp4,
        notaComp5: input.notaComp5,
        notaTotal: notas.reduce((total, nota) => total + nota, 0),
        parecerGeral: input.parecerGeral,
        statusAprovacao: "PENDENTE_APROVACAO",
        anotacoes: {
          create: (input.anotacoes ?? []).map((anotacao) => ({
            posicaoInicio: anotacao.posicaoInicio,
            posicaoFinal: anotacao.posicaoFinal,
            textoSelecionado: anotacao.textoSelecionado,
            tipoErro: anotacao.tipoErro.trim(),
            sugestaoComentario: anotacao.sugestaoComentario,
          })),
        },
      },
      include: correcaoInclude,
    });
    await tx.versaoRedacao.update({
      where: { id: input.idVersao },
      data: { statusVersao: "EM_CORRECAO" },
    });
    return correcao;
  });
}

export async function listarCorrecoesPendentes(idUsuario: number, administrador: boolean) {
  return prisma.correcao.findMany({
    where: administrador
      ? { statusAprovacao: "PENDENTE_APROVACAO" }
      : { idTutor: idUsuario, statusAprovacao: "PENDENTE_APROVACAO" },
    orderBy: { dataCorrecao: "asc" },
    include: correcaoInclude,
  });
}

async function obterCorrecao(idCorrecao: number) {
  const correcao = await prisma.correcao.findUnique({
    where: { id: idCorrecao },
    include: correcaoInclude,
  });
  if (!correcao) {
    throw new ErroNegocio("Correção não encontrada.", 404, "CORRECAO_NAO_ENCONTRADA");
  }
  return correcao;
}

export async function aprovarCorrecao(idUsuarioAdmin: number, idCorrecao: number) {
  const correcao = await obterCorrecao(idCorrecao);
  if (correcao.statusAprovacao !== "PENDENTE_APROVACAO") {
    throw new ErroNegocio("Esta correção não está pendente de aprovação.", 409, "STATUS_INVALIDO");
  }

  const statusVersao = correcao.versao.redacao.tipoFluxo === "AVALIATIVA"
    ? "AGUARDANDO_REESCRITA"
    : "CORRIGIDA";

  return prisma.$transaction(async (tx) => {
    const aprovada = await tx.correcao.update({
      where: { id: idCorrecao },
      data: { statusAprovacao: "APROVADA", idAdm: idUsuarioAdmin },
      include: correcaoInclude,
    });
    await tx.versaoRedacao.update({
      where: { id: correcao.idVersao },
      data: { statusVersao },
    });
    return aprovada;
  });
}

export async function solicitarAjuste(
  idUsuarioAdmin: number,
  idCorrecao: number,
  recadoAdmin: string
) {
  const correcao = await obterCorrecao(idCorrecao);
  if (correcao.statusAprovacao !== "PENDENTE_APROVACAO") {
    throw new ErroNegocio("Esta correção não está pendente de ajuste.", 409, "STATUS_INVALIDO");
  }
  if (!recadoAdmin.trim()) {
    throw new ErroNegocio("O recado para o tutor é obrigatório.", 400, "RECADO_OBRIGATORIO");
  }

  return prisma.$transaction(async (tx) => {
    const ajustada = await tx.correcao.update({
      where: { id: idCorrecao },
      data: {
        statusAprovacao: "AJUSTE_SOLICITADO",
        idAdm: idUsuarioAdmin,
        recadoAdmin,
      },
      include: correcaoInclude,
    });
    await tx.versaoRedacao.update({
      where: { id: correcao.idVersao },
      data: { statusVersao: "AJUSTE_SOLICITADO" },
    });
    return ajustada;
  });
}

export async function buscarCorrecaoVisivel(idUsuario: number, papel: "ADMINISTRADOR" | "TUTOR" | "ALUNO", idCorrecao: number) {
  const correcao = await obterCorrecao(idCorrecao);
  const alunoId = correcao.versao.redacao.aluno.idUsuario;
  const tutorId = correcao.idTutor;
  if (
    (papel === "ADMINISTRADOR") ||
    (papel === "TUTOR" && tutorId === idUsuario) ||
    (papel === "ALUNO" && alunoId === idUsuario && correcao.statusAprovacao === "APROVADA")
  ) {
    return correcao;
  }
  throw new ErroNegocio("Você não possui acesso a esta correção.", 403, "SEM_PERMISSAO");
}
