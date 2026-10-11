import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import type { PapelAtivo } from "./token.service";

export type TipoFluxoRedacao = "TREINO" | "AVALIATIVA";

export interface CriarRedacaoInput {
  tipoFluxo: TipoFluxoRedacao;
  idTarefa?: number;
  idTema?: number;
  conteudoTexto?: string;
}

const redacaoInclude = {
  aluno: {
    include: {
      usuario: { select: { id: true, nome: true, email: true } },
      tutor: { select: { idUsuario: true, idTurma: true } },
    },
  },
  tarefa: {
    include: {
      tema: { select: { id: true, tituloTema: true } },
      turma: { select: { id: true, nome: true, anoLetivo: true, status: true } },
    },
  },
  tema: { select: { id: true, tituloTema: true } },
  versoes: {
    orderBy: { numeroVersao: "asc" as const },
  },
} as const;

const CONTEUDO_MAXIMO = 100_000;

function validarConteudo(conteudoTexto: string | undefined): string {
  const conteudo = conteudoTexto ?? "";
  if (conteudo.length > CONTEUDO_MAXIMO) {
    throw new ErroNegocio(
      `O texto excede o limite de ${CONTEUDO_MAXIMO} caracteres.`,
      400,
      "CONTEUDO_MUITO_LONGO"
    );
  }
  return conteudo;
}

async function obterAluno(idUsuario: number) {
  const aluno = await prisma.aluno.findUnique({
    where: { idUsuario },
    include: { tutor: { include: { turma: true } } },
  });
  if (!aluno) {
    throw new ErroNegocio(
      "A operação está disponível somente para usuários com perfil de aluno.",
      403,
      "SEM_PERMISSAO"
    );
  }
  return aluno;
}

async function validarVinculoDaTarefa(
  idUsuarioAluno: number,
  idTarefa: number,
  tipoFluxo: TipoFluxoRedacao
) {
  const tarefa = await prisma.tarefa.findUnique({
    where: { id: idTarefa },
    include: { tema: true, turma: { include: { tutores: true } } },
  });

  if (!tarefa) {
    throw new ErroNegocio("Tarefa não encontrada.", 404, "TAREFA_NAO_ENCONTRADA");
  }
  if (tipoFluxo !== "AVALIATIVA" || tarefa.modalidade !== "AVALIATIVA") {
    throw new ErroNegocio(
      "Redações avaliativas devem estar vinculadas a uma tarefa avaliativa.",
      400,
      "TAREFA_INVALIDA"
    );
  }
  if (tarefa.turma.status !== "ATIVA") {
    throw new ErroNegocio("A turma desta tarefa não está ativa.", 409, "TURMA_INATIVA");
  }
  const aluno = await prisma.aluno.findUnique({
    where: { idUsuario: idUsuarioAluno },
    include: { tutor: true },
  });
  if (!aluno || aluno.tutor.idTurma !== tarefa.idTurma) {
    throw new ErroNegocio(
      "Você não possui acesso a esta tarefa.",
      403,
      "SEM_PERMISSAO"
    );
  }
  return tarefa;
}

export async function criarRascunho(
  idUsuarioAluno: number,
  input: CriarRedacaoInput
) {
  const aluno = await obterAluno(idUsuarioAluno);
  if (input.tipoFluxo !== "TREINO" && input.tipoFluxo !== "AVALIATIVA") {
    throw new ErroNegocio("Tipo de fluxo inválido.", 400, "TIPO_FLUXO_INVALIDO");
  }

  let idTema = input.idTema;
  if (input.tipoFluxo === "AVALIATIVA") {
    if (!input.idTarefa) {
      throw new ErroNegocio(
        "A redação avaliativa exige uma tarefa.",
        400,
        "TAREFA_OBRIGATORIA"
      );
    }
    const tarefa = await validarVinculoDaTarefa(
      idUsuarioAluno,
      input.idTarefa,
      input.tipoFluxo
    );
    idTema ??= tarefa.idTema ?? undefined;
  } else if (input.idTarefa !== undefined) {
    throw new ErroNegocio(
      "Redações de treino não podem ser vinculadas a tarefas.",
      400,
      "TAREFA_NAO_PERMITIDA"
    );
  }

  if (!idTema) {
    throw new ErroNegocio("Informe o tema da redação.", 400, "TEMA_OBRIGATORIO");
  }
  const tema = await prisma.tema.findUnique({ where: { id: idTema } });
  if (!tema) {
    throw new ErroNegocio("Tema não encontrado.", 404, "TEMA_NAO_ENCONTRADO");
  }

  return prisma.redacao.create({
    data: {
      idAluno: aluno.idUsuario,
      idTarefa: input.idTarefa,
      idTema,
      tipoFluxo: input.tipoFluxo,
      versoes: {
        create: {
          numeroVersao: 1,
          conteudoTexto: validarConteudo(input.conteudoTexto),
          statusVersao: "RASCUNHO",
        },
      },
    },
    include: redacaoInclude,
  });
}

async function obterRedacaoDoUsuario(idRedacao: number, idUsuario: number) {
  const redacao = await prisma.redacao.findUnique({
    where: { id: idRedacao },
    include: redacaoInclude,
  });
  if (!redacao) {
    throw new ErroNegocio("Redação não encontrada.", 404, "REDACAO_NAO_ENCONTRADA");
  }
  if (redacao.idAluno !== idUsuario) {
    throw new ErroNegocio("Você não possui acesso a esta redação.", 403, "SEM_PERMISSAO");
  }
  return redacao;
}

export async function salvarRascunho(
  idUsuarioAluno: number,
  idRedacao: number,
  conteudoTexto: string
) {
  const redacao = await obterRedacaoDoUsuario(idRedacao, idUsuarioAluno);
  const versao = redacao.versoes.find((item) => item.numeroVersao === 1 || item.numeroVersao === 2);
  if (!versao || versao.statusVersao !== "RASCUNHO") {
    throw new ErroNegocio(
      "Somente versões em rascunho podem ser alteradas.",
      409,
      "VERSAO_BLOQUEADA"
    );
  }

  return prisma.versaoRedacao.update({
    where: { id: versao.id },
    data: { conteudoTexto: validarConteudo(conteudoTexto) },
  });
}

export async function enviarVersao(idUsuarioAluno: number, idRedacao: number) {
  const redacao = await obterRedacaoDoUsuario(idRedacao, idUsuarioAluno);
  const versao = redacao.versoes.find((item) => item.numeroVersao === 1 || item.numeroVersao === 2);
  if (!versao || versao.statusVersao !== "RASCUNHO") {
    throw new ErroNegocio(
      "Somente versões em rascunho podem ser enviadas.",
      409,
      "VERSAO_BLOQUEADA"
    );
  }
  if (!versao.conteudoTexto.trim()) {
    throw new ErroNegocio("Não é possível enviar uma redação vazia.", 400, "CONTEUDO_OBRIGATORIO");
  }
  if (redacao.tarefa && redacao.tarefa.prazoEntrega < new Date()) {
    throw new ErroNegocio("O prazo da tarefa já foi encerrado.", 409, "PRAZO_ENCERRADO");
  }

  return prisma.versaoRedacao.update({
    where: { id: versao.id },
    data: { statusVersao: "ENVIADA", dataEnvio: new Date() },
  });
}

export async function criarReescrita(idUsuarioAluno: number, idRedacao: number) {
  const redacao = await obterRedacaoDoUsuario(idRedacao, idUsuarioAluno);
  const versaoUm = redacao.versoes.find((item) => item.numeroVersao === 1);
  if (!versaoUm || versaoUm.statusVersao !== "AGUARDANDO_REESCRITA") {
    throw new ErroNegocio(
      "A reescrita só pode ser criada após a liberação da versão 1.",
      409,
      "REESCRITA_NAO_LIBERADA"
    );
  }
  if (redacao.versoes.some((item) => item.numeroVersao === 2)) {
    throw new ErroNegocio(
      "Esta redação já possui a única reescrita permitida.",
      409,
      "LIMITE_REESCRITA"
    );
  }

  return prisma.versaoRedacao.create({
    data: {
      idRedacao,
      numeroVersao: 2,
      conteudoTexto: "",
      statusVersao: "RASCUNHO",
    },
  });
}

export async function listarRedacoesVisiveis(
  idUsuario: number,
  papelAtivo: PapelAtivo
) {
  const where =
    papelAtivo === "ADMINISTRADOR"
      ? {}
      : papelAtivo === "ALUNO"
        ? { idAluno: idUsuario }
        : { aluno: { tutor: { idUsuario } } };

  return prisma.redacao.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    include: redacaoInclude,
  });
}

export async function buscarRedacaoVisivel(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  idRedacao: number
) {
  if (papelAtivo === "ALUNO") {
    return obterRedacaoDoUsuario(idRedacao, idUsuario);
  }

  const redacao = await prisma.redacao.findUnique({
    where: { id: idRedacao },
    include: redacaoInclude,
  });
  if (!redacao) {
    throw new ErroNegocio("Redação não encontrada.", 404, "REDACAO_NAO_ENCONTRADA");
  }
  if (papelAtivo === "TUTOR" && redacao.aluno.tutor.idUsuario !== idUsuario) {
    throw new ErroNegocio("Você não possui acesso a esta redação.", 403, "SEM_PERMISSAO");
  }
  return redacao;
}
