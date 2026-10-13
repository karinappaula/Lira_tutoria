import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import { registrarAuditoria } from "./auditoria.service";
import type { PapelAtivo } from "./token.service";

// Status da correção (coluna CORRECAO.status_aprovacao).
// LIBERADA = correção de redação de TREINO: vai direto ao aluno (RN02).
export const STATUS_CORRECAO = {
  PENDENTE: "PENDENTE_APROVACAO",
  APROVADA: "APROVADA",
  AJUSTE: "AJUSTE_SOLICITADO",
  LIBERADA: "LIBERADA",
} as const;

// Correções que o aluno pode enxergar (RN02 e RN03).
export const STATUS_VISIVEIS_AO_ALUNO: string[] = [
  STATUS_CORRECAO.APROVADA,
  STATUS_CORRECAO.LIBERADA,
];

const TEXTO_MAXIMO = 5000;

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
  comentarioComp1?: string;
  comentarioComp2?: string;
  comentarioComp3?: string;
  comentarioComp4?: string;
  comentarioComp5?: string;
  parecerGeral?: string;
  recadoAdmin?: string;
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

function validarTexto(valor: string | undefined, campo: string): string | undefined {
  if (valor === undefined) return undefined;
  if (valor.length > TEXTO_MAXIMO) {
    throw new ErroNegocio(
      `${campo} excede o limite de ${TEXTO_MAXIMO} caracteres.`,
      400,
      "TEXTO_MUITO_LONGO"
    );
  }
  return valor;
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

  const comentarios = [
    validarTexto(input.comentarioComp1, "comentarioComp1"),
    validarTexto(input.comentarioComp2, "comentarioComp2"),
    validarTexto(input.comentarioComp3, "comentarioComp3"),
    validarTexto(input.comentarioComp4, "comentarioComp4"),
    validarTexto(input.comentarioComp5, "comentarioComp5"),
  ];
  const parecerGeral = validarTexto(input.parecerGeral, "parecerGeral");
  const recadoAdmin = validarTexto(input.recadoAdmin, "recadoAdmin");

  // RN02: treino não passa pela Administração; avaliativa passa (RN03).
  const ehTreino = versao.redacao.tipoFluxo === "TREINO";
  const statusAprovacao = ehTreino ? STATUS_CORRECAO.LIBERADA : STATUS_CORRECAO.PENDENTE;
  const statusVersao = ehTreino ? "CORRIGIDA" : "EM_CORRECAO";

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
        comentarioComp1: comentarios[0],
        comentarioComp2: comentarios[1],
        comentarioComp3: comentarios[2],
        comentarioComp4: comentarios[3],
        comentarioComp5: comentarios[4],
        parecerGeral,
        // O recado só faz sentido quando existe aprovação da Administração.
        recadoAdmin: ehTreino ? undefined : recadoAdmin,
        statusAprovacao,
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
      data: { statusVersao },
    });
    await registrarAuditoria(
      {
        idUsuario: idUsuarioTutor,
        acao: numeroAjuste === 0 ? "CORRECAO_CRIADA" : "CORRECAO_REENVIADA",
        entidade: "CORRECAO",
        idRegistro: correcao.id,
        descricao: `Versão ${versao.numeroVersao} da redação ${versao.idRedacao} (${versao.redacao.tipoFluxo}), ajuste ${numeroAjuste}.`,
      },
      tx
    );
    return correcao;
  });
}

export async function listarCorrecoesPendentes(idUsuario: number, administrador: boolean) {
  return prisma.correcao.findMany({
    where: administrador
      ? { statusAprovacao: STATUS_CORRECAO.PENDENTE }
      : { idTutor: idUsuario, statusAprovacao: STATUS_CORRECAO.PENDENTE },
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
  if (correcao.statusAprovacao !== STATUS_CORRECAO.PENDENTE) {
    throw new ErroNegocio("Esta correção não está pendente de aprovação.", 409, "STATUS_INVALIDO");
  }

  // Aprovar libera o RESULTADO ao aluno. A reescrita NÃO é liberada aqui:
  // quem decide pedir a reescrita é o Tutor (RF07), depois da liberação.
  return prisma.$transaction(async (tx) => {
    const aprovada = await tx.correcao.update({
      where: { id: idCorrecao },
      data: { statusAprovacao: STATUS_CORRECAO.APROVADA, idAdm: idUsuarioAdmin },
      include: correcaoInclude,
    });
    await tx.versaoRedacao.update({
      where: { id: correcao.idVersao },
      data: { statusVersao: "CORRIGIDA" },
    });
    await registrarAuditoria(
      {
        idUsuario: idUsuarioAdmin,
        acao: "CORRECAO_APROVADA",
        entidade: "CORRECAO",
        idRegistro: idCorrecao,
      },
      tx
    );
    return aprovada;
  });
}

export async function solicitarAjuste(
  idUsuarioAdmin: number,
  idCorrecao: number,
  comentarioAjuste: string
) {
  const correcao = await obterCorrecao(idCorrecao);
  if (correcao.statusAprovacao !== STATUS_CORRECAO.PENDENTE) {
    throw new ErroNegocio("Esta correção não está pendente de ajuste.", 409, "STATUS_INVALIDO");
  }
  if (!comentarioAjuste.trim()) {
    throw new ErroNegocio("A observação para o tutor é obrigatória.", 400, "RECADO_OBRIGATORIO");
  }
  validarTexto(comentarioAjuste, "comentarioAjuste");

  return prisma.$transaction(async (tx) => {
    const ajustada = await tx.correcao.update({
      where: { id: idCorrecao },
      data: {
        statusAprovacao: STATUS_CORRECAO.AJUSTE,
        idAdm: idUsuarioAdmin,
        // Texto da Administração fica em comentarioAjusteAdmin.
        // recadoAdmin continua sendo exclusivamente o recado do Tutor.
        comentarioAjusteAdmin: comentarioAjuste.trim(),
      },
      include: correcaoInclude,
    });
    await tx.versaoRedacao.update({
      where: { id: correcao.idVersao },
      data: { statusVersao: "AJUSTE_SOLICITADO" },
    });
    await registrarAuditoria(
      {
        idUsuario: idUsuarioAdmin,
        acao: "AJUSTE_SOLICITADO",
        entidade: "CORRECAO",
        idRegistro: idCorrecao,
      },
      tx
    );
    return ajustada;
  });
}

// Remove do que vai para o ALUNO os campos internos (recado do Tutor,
// observação da Administração, dados da Administração e e-mails).
export function paraVisaoDoAluno<
  T extends {
    recadoAdmin: string | null;
    comentarioAjusteAdmin: string | null;
    idAdm: number | null;
  },
>(correcao: T) {
  const { recadoAdmin, comentarioAjusteAdmin, idAdm, ...publico } = correcao;
  void recadoAdmin;
  void comentarioAjusteAdmin;
  void idAdm;
  return publico;
}

export async function buscarCorrecaoVisivel(
  idUsuario: number,
  papel: PapelAtivo,
  idCorrecao: number
) {
  const correcao = await obterCorrecao(idCorrecao);

  if (papel === "ADMINISTRADOR") return correcao;

  if (papel === "TUTOR") {
    if (correcao.idTutor === idUsuario) return correcao;
  }

  if (
    papel === "ALUNO" &&
    correcao.versao.redacao.aluno.idUsuario === idUsuario &&
    STATUS_VISIVEIS_AO_ALUNO.includes(correcao.statusAprovacao)
  ) {
    const { administrador, tutor, ...resto } = paraVisaoDoAluno(correcao);
    void administrador;
    return {
      ...resto,
      tutor: { idUsuario: tutor.idUsuario, usuario: { nome: tutor.usuario.nome } },
    };
  }

  throw new ErroNegocio("Você não possui acesso a esta correção.", 403, "SEM_PERMISSAO");
}
