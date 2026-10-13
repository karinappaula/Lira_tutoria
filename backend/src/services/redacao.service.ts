import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import { registrarAuditoria } from "./auditoria.service";
import { paraVisaoDoAluno, STATUS_VISIVEIS_AO_ALUNO } from "./correcao.service";
import type { PapelAtivo } from "./token.service";

export type TipoFluxoRedacao = "TREINO" | "AVALIATIVA";

export interface CriarRedacaoInput {
  tipoFluxo: TipoFluxoRedacao;
  idTarefa?: number;
  idTema?: number;
  temaProprio?: { tituloTema: string; textoMotivador?: string };
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

// Usado só no detalhe da redação: traz o histórico completo
// (versões → correções → anotações) conforme RN05/US17.
const redacaoDetalheInclude = {
  ...redacaoInclude,
  versoes: {
    orderBy: { numeroVersao: "asc" as const },
    include: {
      correcoes: {
        orderBy: { numeroAjuste: "asc" as const },
        include: {
          anotacoes: true,
          tutor: { select: { idUsuario: true, usuario: { select: { nome: true } } } },
        },
      },
    },
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
    include: { tema: true, turma: true },
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
  // RN06: a tarefa pertence ao Tutor e vale para os tutorados dele.
  const aluno = await prisma.aluno.findUnique({ where: { idUsuario: idUsuarioAluno } });
  if (!aluno || tarefa.idTutor !== aluno.idTutor) {
    throw new ErroNegocio("Você não possui acesso a esta tarefa.", 403, "SEM_PERMISSAO");
  }
  if (tarefa.turma && tarefa.turma.status !== "ATIVA") {
    throw new ErroNegocio("A turma desta tarefa não está ativa.", 409, "TURMA_INATIVA");
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

  // US06: no treino o aluno usa um tema existente OU cria o próprio.
  const temaProprio = input.temaProprio;
  if (temaProprio) {
    if (input.tipoFluxo !== "TREINO") {
      throw new ErroNegocio(
        "Tema próprio só pode ser usado em redação de treino.",
        400,
        "TEMA_PROPRIO_NAO_PERMITIDO"
      );
    }
    if (input.idTema !== undefined) {
      throw new ErroNegocio(
        "Informe idTema ou temaProprio, não os dois.",
        400,
        "TEMA_DUPLICADO"
      );
    }
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

  if (!temaProprio) {
    if (!idTema) {
      throw new ErroNegocio("Informe o tema da redação.", 400, "TEMA_OBRIGATORIO");
    }
    const tema = await prisma.tema.findUnique({ where: { id: idTema } });
    // Tema próprio de outro aluno é tratado como inexistente.
    if (!tema || (tema.idCriador !== null && tema.idCriador !== aluno.idUsuario)) {
      throw new ErroNegocio("Tema não encontrado.", 404, "TEMA_NAO_ENCONTRADO");
    }
  }

  const conteudoTexto = validarConteudo(input.conteudoTexto);
  return prisma.$transaction(async (tx) => {
    let idTemaFinal = idTema;
    if (temaProprio) {
      const novoTema = await tx.tema.create({
        data: {
          tituloTema: temaProprio.tituloTema,
          textoMotivador: temaProprio.textoMotivador,
          origem: "ALUNO",
          idCriador: aluno.idUsuario,
        },
      });
      idTemaFinal = novoTema.id;
    }
    return tx.redacao.create({
      data: {
        idAluno: aluno.idUsuario,
        idTarefa: input.idTarefa,
        idTema: idTemaFinal,
        tipoFluxo: input.tipoFluxo,
        versoes: {
          create: {
            numeroVersao: 1,
            conteudoTexto,
            statusVersao: "RASCUNHO",
          },
        },
      },
      include: redacaoInclude,
    });
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

// As versões vêm ordenadas (1, 2). A versão "atual" é sempre a última.
// Antes, um find() devolvia sempre a V1 e bloqueava a reescrita.
export async function salvarRascunho(
  idUsuarioAluno: number,
  idRedacao: number,
  conteudoTexto: string
) {
  const redacao = await obterRedacaoDoUsuario(idRedacao, idUsuarioAluno);
  const versao = redacao.versoes[redacao.versoes.length - 1];
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
  const versao = redacao.versoes[redacao.versoes.length - 1];
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
  // O prazo da tarefa vale para a primeira versão. A reescrita acontece
  // depois da correção, portanto depois do prazo, e não deve ser bloqueada.
  if (versao.numeroVersao === 1 && redacao.tarefa && redacao.tarefa.prazoEntrega < new Date()) {
    throw new ErroNegocio("O prazo da tarefa já foi encerrado.", 409, "PRAZO_ENCERRADO");
  }

  return prisma.$transaction(async (tx) => {
    const enviada = await tx.versaoRedacao.update({
      where: { id: versao.id },
      data: { statusVersao: "ENVIADA", dataEnvio: new Date() },
    });
    await registrarAuditoria(
      {
        idUsuario: idUsuarioAluno,
        acao: versao.numeroVersao === 1 ? "REDACAO_ENVIADA" : "REESCRITA_ENVIADA",
        entidade: "VERSAO_REDACAO",
        idRegistro: versao.id,
        descricao: `Redação ${idRedacao}, versão ${versao.numeroVersao}.`,
      },
      tx
    );
    return enviada;
  });
}

export async function criarReescrita(idUsuarioAluno: number, idRedacao: number) {
  const redacao = await obterRedacaoDoUsuario(idRedacao, idUsuarioAluno);
  if (redacao.versoes.some((item) => item.numeroVersao === 2)) {
    throw new ErroNegocio(
      "Esta redação já possui a única reescrita permitida.",
      409,
      "LIMITE_REESCRITA"
    );
  }
  const versaoUm = redacao.versoes.find((item) => item.numeroVersao === 1);
  if (!versaoUm || versaoUm.statusVersao !== "AGUARDANDO_REESCRITA") {
    throw new ErroNegocio(
      "A reescrita só pode ser iniciada depois que o tutor a solicitar.",
      409,
      "REESCRITA_NAO_LIBERADA"
    );
  }

  return prisma.$transaction(async (tx) => {
    const versaoDois = await tx.versaoRedacao.create({
      data: {
        idRedacao,
        numeroVersao: 2,
        conteudoTexto: "",
        statusVersao: "RASCUNHO",
      },
    });
    // A V1 volta a ser apenas histórico (já corrigida).
    await tx.versaoRedacao.update({
      where: { id: versaoUm.id },
      data: { statusVersao: "CORRIGIDA" },
    });
    await registrarAuditoria(
      {
        idUsuario: idUsuarioAluno,
        acao: "REESCRITA_INICIADA",
        entidade: "VERSAO_REDACAO",
        idRegistro: versaoDois.id,
        descricao: `Redação ${idRedacao}.`,
      },
      tx
    );
    return versaoDois;
  });
}

// RF07 / US15: é o TUTOR quem pede a reescrita, depois que a correção
// da versão 1 foi liberada ao aluno (treino: ao corrigir; avaliativa:
// após a aprovação da Administração). Só existe uma reescrita (RN05).
export async function solicitarReescrita(idUsuarioTutor: number, idRedacao: number) {
  const redacao = await prisma.redacao.findUnique({
    where: { id: idRedacao },
    include: redacaoInclude,
  });
  if (!redacao) {
    throw new ErroNegocio("Redação não encontrada.", 404, "REDACAO_NAO_ENCONTRADA");
  }
  if (redacao.aluno.tutor.idUsuario !== idUsuarioTutor) {
    throw new ErroNegocio("Você não possui acesso a esta redação.", 403, "SEM_PERMISSAO");
  }
  if (redacao.versoes.some((item) => item.numeroVersao === 2)) {
    throw new ErroNegocio(
      "Esta redação já possui a única reescrita permitida.",
      409,
      "LIMITE_REESCRITA"
    );
  }
  const versaoUm = redacao.versoes.find((item) => item.numeroVersao === 1);
  if (!versaoUm || versaoUm.statusVersao !== "CORRIGIDA") {
    throw new ErroNegocio(
      "A reescrita só pode ser solicitada depois que a correção da versão 1 for liberada ao aluno.",
      409,
      "REESCRITA_INDISPONIVEL"
    );
  }

  return prisma.$transaction(async (tx) => {
    const atualizada = await tx.versaoRedacao.update({
      where: { id: versaoUm.id },
      data: { statusVersao: "AGUARDANDO_REESCRITA" },
    });
    await registrarAuditoria(
      {
        idUsuario: idUsuarioTutor,
        acao: "REESCRITA_SOLICITADA",
        entidade: "REDACAO",
        idRegistro: idRedacao,
      },
      tx
    );
    return atualizada;
  });
}

// RF04: exclusão de rascunho. Só vale para redação ainda não enviada.
export async function excluirRascunho(idUsuarioAluno: number, idRedacao: number) {
  const redacao = await obterRedacaoDoUsuario(idRedacao, idUsuarioAluno);
  if (redacao.versoes.length !== 1 || redacao.versoes[0].statusVersao !== "RASCUNHO") {
    throw new ErroNegocio(
      "Somente redações ainda não enviadas podem ser excluídas.",
      409,
      "REDACAO_JA_ENVIADA"
    );
  }
  await prisma.redacao.delete({ where: { id: idRedacao } });
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
  const redacao = await prisma.redacao.findUnique({
    where: { id: idRedacao },
    include: redacaoDetalheInclude,
  });
  if (!redacao) {
    throw new ErroNegocio("Redação não encontrada.", 404, "REDACAO_NAO_ENCONTRADA");
  }

  if (papelAtivo === "ALUNO") {
    if (redacao.idAluno !== idUsuario) {
      throw new ErroNegocio("Você não possui acesso a esta redação.", 403, "SEM_PERMISSAO");
    }
    // O aluno só enxerga correções já liberadas (RN02/RN03) e sem os
    // campos internos (recado do Tutor e observação da Administração).
    return {
      ...redacao,
      versoes: redacao.versoes.map((versao) => ({
        ...versao,
        statusVersao:
          versao.statusVersao === "AJUSTE_SOLICITADO" ? "EM_CORRECAO" : versao.statusVersao,
        correcoes: versao.correcoes
          .filter((correcao) => STATUS_VISIVEIS_AO_ALUNO.includes(correcao.statusAprovacao))
          .map((correcao) => paraVisaoDoAluno(correcao)),
      })),
    };
  }

  if (papelAtivo === "TUTOR" && redacao.aluno.tutor.idUsuario !== idUsuario) {
    throw new ErroNegocio("Você não possui acesso a esta redação.", 403, "SEM_PERMISSAO");
  }
  return redacao;
}

// Fila do Tutor: versões enviadas pelos seus tutorados que ainda precisam
// de correção (ENVIADA) ou de revisão pedida pela Administração.
export async function listarAguardandoCorrecao(idUsuarioTutor: number) {
  return prisma.versaoRedacao.findMany({
    where: {
      statusVersao: { in: ["ENVIADA", "AJUSTE_SOLICITADO"] },
      redacao: { aluno: { idTutor: idUsuarioTutor } },
    },
    orderBy: { dataEnvio: "asc" },
    include: {
      redacao: {
        select: {
          id: true,
          tipoFluxo: true,
          tema: { select: { id: true, tituloTema: true } },
          tarefa: { select: { id: true, tituloTarefa: true, prazoEntrega: true } },
          aluno: {
            select: { idUsuario: true, usuario: { select: { nome: true } } },
          },
        },
      },
      correcoes: {
        orderBy: { numeroAjuste: "desc" },
        take: 1,
        select: {
          id: true,
          numeroAjuste: true,
          statusAprovacao: true,
          comentarioAjusteAdmin: true,
        },
      },
    },
  });
}
