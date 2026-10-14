import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import { registrarAuditoria } from "./auditoria.service";
import type { PapelAtivo } from "./token.service";

export interface EnviarComunicadoInput {
  tituloComunicado: string;
  mensagem: string;
  idTurma?: number;
}

const TITULO_MAX = 200;
const MENSAGEM_MAX = 5000;

const remetenteSelect = { select: { id: true, nome: true } } as const;

// RF18 / US35 / RN01:
// - Administração envia para Tutores (todos, ou os de uma turma);
// - Tutor envia para os seus tutorados;
// - Aluno só recebe.
export async function enviarComunicado(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  input: EnviarComunicadoInput
) {
  const titulo = input.tituloComunicado.trim();
  const mensagem = input.mensagem.trim();
  if (!titulo || titulo.length > TITULO_MAX) {
    throw new ErroNegocio(`O título é obrigatório (até ${TITULO_MAX} caracteres).`, 400, "TITULO_INVALIDO");
  }
  if (!mensagem || mensagem.length > MENSAGEM_MAX) {
    throw new ErroNegocio(`A mensagem é obrigatória (até ${MENSAGEM_MAX} caracteres).`, 400, "MENSAGEM_INVALIDA");
  }

  let destinatarios: number[];
  if (papelAtivo === "ADMINISTRADOR") {
    if (input.idTurma !== undefined) {
      const turma = await prisma.turma.findUnique({ where: { id: input.idTurma } });
      if (!turma) throw new ErroNegocio("Turma não encontrada.", 404, "TURMA_NAO_ENCONTRADA");
    }
    const tutores = await prisma.tutor.findMany({
      where: {
        ...(input.idTurma !== undefined ? { idTurma: input.idTurma } : {}),
        usuario: { status: "ATIVO" },
      },
      select: { idUsuario: true },
    });
    destinatarios = tutores.map((tutor) => tutor.idUsuario);
  } else if (papelAtivo === "TUTOR") {
    if (input.idTurma !== undefined) {
      throw new ErroNegocio(
        "O tutor envia comunicados apenas aos seus próprios tutorados.",
        400,
        "DESTINO_INVALIDO"
      );
    }
    const alunos = await prisma.aluno.findMany({
      where: { idTutor: idUsuario, usuario: { status: "ATIVO" } },
      select: { idUsuario: true },
    });
    destinatarios = alunos.map((aluno) => aluno.idUsuario);
  } else {
    throw new ErroNegocio("Você não possui permissão para enviar comunicados.", 403, "SEM_PERMISSAO");
  }

  if (destinatarios.length === 0) {
    throw new ErroNegocio("Não há destinatários para este comunicado.", 409, "SEM_DESTINATARIOS");
  }

  return prisma.$transaction(async (tx) => {
    const comunicado = await tx.comunicado.create({
      data: {
        idUsuarioRemetente: idUsuario,
        tituloComunicado: titulo,
        mensagem,
        destinatarios: {
          create: destinatarios.map((idUsuarioDestinatario) => ({ idUsuarioDestinatario })),
        },
      },
      include: { remetente: remetenteSelect },
    });
    await registrarAuditoria(
      {
        idUsuario,
        acao: "COMUNICADO_ENVIADO",
        entidade: "COMUNICADO",
        idRegistro: comunicado.id,
        descricao: `${destinatarios.length} destinatário(s).`,
      },
      tx
    );
    return { ...comunicado, quantidadeDestinatarios: destinatarios.length };
  });
}

// O Tutor recebe da Administração; o Aluno recebe de Tutores.
// Quem é Tutor e Aluno na mesma conta vê cada caixa conforme o papel ativo.
function filtroDeRecebidos(
  idUsuario: number,
  papelAtivo: PapelAtivo
): Prisma.ComunicadoDestinatarioWhereInput {
  return {
    idUsuarioDestinatario: idUsuario,
    comunicado: {
      remetente:
        papelAtivo === "TUTOR"
          ? { administrador: { isNot: null } }
          : { administrador: { is: null } },
    },
  };
}

export async function listarRecebidos(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  apenasNaoLidos: boolean
) {
  const registros = await prisma.comunicadoDestinatario.findMany({
    where: { ...filtroDeRecebidos(idUsuario, papelAtivo), ...(apenasNaoLidos ? { lido: false } : {}) },
    orderBy: { comunicado: { dataEnvio: "desc" } },
    include: { comunicado: { include: { remetente: remetenteSelect } } },
  });
  return registros.map((registro) => ({
    idComunicado: registro.idComunicado,
    lido: registro.lido,
    tituloComunicado: registro.comunicado.tituloComunicado,
    mensagem: registro.comunicado.mensagem,
    dataEnvio: registro.comunicado.dataEnvio,
    remetente: registro.comunicado.remetente,
  }));
}

// Número do sino de avisos.
export async function contarNaoLidos(idUsuario: number, papelAtivo: PapelAtivo) {
  const naoLidos = await prisma.comunicadoDestinatario.count({
    where: { ...filtroDeRecebidos(idUsuario, papelAtivo), lido: false },
  });
  return { naoLidos };
}

export async function marcarComoLido(idUsuario: number, idComunicado: number) {
  const resultado = await prisma.comunicadoDestinatario.updateMany({
    where: { idComunicado, idUsuarioDestinatario: idUsuario },
    data: { lido: true },
  });
  if (resultado.count === 0) {
    throw new ErroNegocio("Comunicado não encontrado.", 404, "COMUNICADO_NAO_ENCONTRADO");
  }
  return { idComunicado, lido: true };
}

// Administração e Tutor acompanham o que enviaram e quantos já leram.
export async function listarEnviados(idUsuario: number) {
  const comunicados = await prisma.comunicado.findMany({
    where: { idUsuarioRemetente: idUsuario },
    orderBy: { dataEnvio: "desc" },
    include: { destinatarios: { select: { lido: true } } },
  });
  return comunicados.map(({ destinatarios, ...comunicado }) => ({
    ...comunicado,
    quantidadeDestinatarios: destinatarios.length,
    quantidadeLidos: destinatarios.filter((destinatario) => destinatario.lido).length,
  }));
}

// Pode ver: o remetente, um destinatário ou a Administração (visão geral, RN13).
export async function buscarComunicado(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  idComunicado: number
) {
  const comunicado = await prisma.comunicado.findUnique({
    where: { id: idComunicado },
    include: { remetente: remetenteSelect, destinatarios: { select: { idUsuarioDestinatario: true, lido: true } } },
  });
  if (!comunicado) {
    throw new ErroNegocio("Comunicado não encontrado.", 404, "COMUNICADO_NAO_ENCONTRADO");
  }
  const ehRemetente = comunicado.idUsuarioRemetente === idUsuario;
  const meuRegistro = comunicado.destinatarios.find((item) => item.idUsuarioDestinatario === idUsuario);
  if (!ehRemetente && !meuRegistro && papelAtivo !== "ADMINISTRADOR") {
    // 404 de propósito: não revela que o comunicado existe.
    throw new ErroNegocio("Comunicado não encontrado.", 404, "COMUNICADO_NAO_ENCONTRADO");
  }

  const { destinatarios, ...dados } = comunicado;
  return {
    ...dados,
    ...(ehRemetente || papelAtivo === "ADMINISTRADOR"
      ? {
          quantidadeDestinatarios: destinatarios.length,
          quantidadeLidos: destinatarios.filter((item) => item.lido).length,
        }
      : { lido: meuRegistro?.lido ?? false }),
  };
}
