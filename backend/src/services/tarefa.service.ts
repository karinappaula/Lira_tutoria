import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import { registrarAuditoria } from "./auditoria.service";
import type { PapelAtivo } from "./token.service";

export interface NovoTemaInput {
  tituloTema: string;
  textoMotivador?: string;
}

export interface CriarTarefaInput {
  idTema?: number;
  novoTema?: NovoTemaInput; // cria o tema junto com a tarefa (alternativa a idTema)
  tituloTarefa: string;
  descricao?: string;
  prazoEntrega: Date;
}

export interface AtualizarTarefaInput {
  idTema?: number;
  tituloTarefa?: string;
  descricao?: string;
  prazoEntrega?: Date;
}

export interface AnexoInput {
  nomeArquivo: string;
  url: string;
  tipoArquivo: string;
}

// US19 / DEC-020: anexos de tarefa são PDF ou imagem.
export const TIPOS_ANEXO_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Situação das versões, usada para montar o progresso da tarefa.
const STATUS_CONCLUIDA = ["CORRIGIDA", "AGUARDANDO_REESCRITA"];
const STATUS_EM_CORRECAO = ["ENVIADA", "EM_CORRECAO", "AJUSTE_SOLICITADO"];

const tarefaInclude = {
  turma: { select: { id: true, nome: true, anoLetivo: true, status: true } },
  tema: { select: { id: true, tituloTema: true, textoMotivador: true } },
  tutor: { select: { idUsuario: true, usuario: { select: { nome: true } } } },
  administrador: { select: { idUsuario: true, usuario: { select: { nome: true } } } },
  anexos: {
    select: { id: true, nomeArquivo: true, caminhoArquivo: true, tipoArquivo: true, criadoEm: true },
    orderBy: { id: "asc" as const },
  },
  _count: { select: { tarefasAplicadas: true } },
} as const;

async function obterTutor(idUsuario: number) {
  const tutor = await prisma.tutor.findUnique({
    where: { idUsuario },
    include: { turma: true },
  });
  if (!tutor) {
    throw new ErroNegocio("Você não possui perfil de tutor.", 403, "SEM_PERMISSAO");
  }
  return tutor;
}

function exigirTurmaAtiva(turma: { status: string }) {
  if (turma.status !== "ATIVA") {
    throw new ErroNegocio(
      "Não é possível criar ou aplicar tarefas em uma turma inativa.",
      409,
      "TURMA_INATIVA"
    );
  }
}

// Tema de tarefa: oficial (qualquer um) ou criado pelo próprio Tutor.
// Tema de aluno e tema de outro Tutor nunca servem.
async function validarTema(idTema: number | undefined, idUsuario: number, papelAtivo: PapelAtivo) {
  if (idTema === undefined) return;
  const tema = await prisma.tema.findUnique({ where: { id: idTema } });
  const permitido =
    !!tema &&
    (tema.idCriador === null ||
      (papelAtivo === "TUTOR" && tema.origem === "TUTOR" && tema.idCriador === idUsuario));
  if (!permitido) {
    throw new ErroNegocio("Tema não encontrado.", 404, "TEMA_NAO_ENCONTRADO");
  }
}

function exigirApenasUmTema(input: CriarTarefaInput) {
  if (input.novoTema && input.idTema !== undefined) {
    throw new ErroNegocio("Informe idTema ou novoTema, não os dois.", 400, "TEMA_DUPLICADO");
  }
}

// Tutor: cria tarefa AVALIATIVA para os seus tutorados (RN06).
// A turma é a do próprio Tutor, não vem do corpo da requisição.
export async function criarTarefaPorTutor(idUsuarioTutor: number, input: CriarTarefaInput) {
  const tutor = await obterTutor(idUsuarioTutor);
  exigirTurmaAtiva(tutor.turma);
  exigirApenasUmTema(input);
  await validarTema(input.idTema, idUsuarioTutor, "TUTOR");

  return prisma.$transaction(async (tx) => {
    // O Tutor pode criar o tema na hora de criar a tarefa.
    let idTema = input.idTema;
    if (input.novoTema) {
      const tema = await tx.tema.create({
        data: {
          tituloTema: input.novoTema.tituloTema,
          textoMotivador: input.novoTema.textoMotivador,
          origem: "TUTOR",
          idCriador: idUsuarioTutor,
        },
      });
      idTema = tema.id;
    }
    const tarefa = await tx.tarefa.create({
      data: {
        idTutor: idUsuarioTutor,
        idTurma: tutor.idTurma,
        idTema,
        tituloTarefa: input.tituloTarefa,
        descricao: input.descricao,
        prazoEntrega: input.prazoEntrega,
        modalidade: "AVALIATIVA",
      },
      include: tarefaInclude,
    });
    await registrarAuditoria(
      { idUsuario: idUsuarioTutor, acao: "TAREFA_CRIADA", entidade: "TAREFA", idRegistro: tarefa.id },
      tx
    );
    return tarefa;
  });
}

// Administração: cria atividade GERAL (RF09 / RN07). Funciona como modelo:
// não pertence a uma turma e os Tutores a aplicam aos seus grupos.
export async function criarTarefaGeral(idUsuarioAdmin: number, input: CriarTarefaInput) {
  exigirApenasUmTema(input);
  await validarTema(input.idTema, idUsuarioAdmin, "ADMINISTRADOR");

  return prisma.$transaction(async (tx) => {
    // Na Administração, o tema criado junto é oficial.
    let idTema = input.idTema;
    if (input.novoTema) {
      const tema = await tx.tema.create({
        data: {
          tituloTema: input.novoTema.tituloTema,
          textoMotivador: input.novoTema.textoMotivador,
          origem: "OFICIAL",
        },
      });
      idTema = tema.id;
    }
    const tarefa = await tx.tarefa.create({
      data: {
        idAdm: idUsuarioAdmin,
        idTema,
        tituloTarefa: input.tituloTarefa,
        descricao: input.descricao,
        prazoEntrega: input.prazoEntrega,
        modalidade: "GERAL",
      },
      include: tarefaInclude,
    });
    await registrarAuditoria(
      { idUsuario: idUsuarioAdmin, acao: "ATIVIDADE_GERAL_CRIADA", entidade: "TAREFA", idRegistro: tarefa.id },
      tx
    );
    return tarefa;
  });
}

type TarefaListada = Awaited<ReturnType<typeof buscarTarefasDoBanco>>[number];

async function buscarTarefasDoBanco(where: Prisma.TarefaWhereInput) {
  return prisma.tarefa.findMany({
    where,
    orderBy: [{ prazoEntrega: "asc" }, { criadoEm: "desc" }],
    include: tarefaInclude,
  });
}

// O aluno não precisa ver quem é a Administração nem contadores internos.
function paraVisaoDoAluno(tarefa: TarefaListada) {
  const { administrador, _count, ...publico } = tarefa;
  void administrador;
  void _count;
  const anexoPrincipal = tarefa.anexos?.[0]?.caminhoArquivo ?? null;
  return {
    ...publico,
    anexoUrl: anexoPrincipal,
    arquivoUrl: anexoPrincipal,
  };
}

// Acrescenta o que cada papel precisa na lista:
// - aluno: o id da própria redação da tarefa (iniciar x continuar);
// - tutor/admin: progresso da turma ("1 de 2 concluíram").
async function enriquecer(tarefas: TarefaListada[], idUsuario: number, papel: PapelAtivo) {
  if (tarefas.length === 0) return [];

  if (papel === "ALUNO") {
    const redacoes = await prisma.redacao.findMany({
      where: { idAluno: idUsuario, idTarefa: { in: tarefas.map((t) => t.id) } },
      select: { id: true, idTarefa: true },
    });
    const porTarefa = new Map(redacoes.map((r) => [r.idTarefa, r.id]));
    return tarefas.map((tarefa) => ({
      ...paraVisaoDoAluno(tarefa),
      idRedacao: porTarefa.get(tarefa.id) ?? null,
    }));
  }

  const idsAvaliativas = tarefas.filter((t) => t.modalidade === "AVALIATIVA").map((t) => t.id);
  const redacoes = idsAvaliativas.length
    ? await prisma.redacao.findMany({
        where: { idTarefa: { in: idsAvaliativas } },
        select: { idTarefa: true, versoes: { select: { statusVersao: true } } },
      })
    : [];
  const tutorados = await prisma.aluno.groupBy({ by: ["idTutor"], _count: { _all: true } });
  const totalPorTutor = new Map(tutorados.map((t) => [t.idTutor, t._count._all]));

  return tarefas.map((tarefa) => {
    if (tarefa.modalidade !== "AVALIATIVA") {
      return { ...tarefa, progresso: null };
    }
    let concluidas = 0;
    let emCorrecao = 0;
    for (const redacao of redacoes.filter((r) => r.idTarefa === tarefa.id)) {
      const status = redacao.versoes.map((v) => v.statusVersao);
      if (status.some((s) => STATUS_CONCLUIDA.includes(s))) concluidas += 1;
      else if (status.some((s) => STATUS_EM_CORRECAO.includes(s))) emCorrecao += 1;
    }
    return {
      ...tarefa,
      progresso: {
        totalTutorados: tarefa.idTutor ? (totalPorTutor.get(tarefa.idTutor) ?? 0) : 0,
        concluidas,
        emCorrecao,
      },
    };
  });
}

// Visibilidade (RN06 / RN07):
// - Administração: tudo (acompanha o que os Tutores aplicam);
// - Tutor: as próprias tarefas + as atividades gerais (modelos);
// - Aluno: somente as tarefas avaliativas do seu Tutor.
export async function listarTarefasVisiveis(idUsuario: number, papelAtivo: PapelAtivo) {
  let where: Prisma.TarefaWhereInput = {};
  if (papelAtivo === "TUTOR") {
    where = { OR: [{ idTutor: idUsuario }, { modalidade: "GERAL" }] };
  } else if (papelAtivo === "ALUNO") {
    const aluno = await prisma.aluno.findUnique({ where: { idUsuario } });
    if (!aluno) {
      throw new ErroNegocio("Você não possui perfil de aluno.", 403, "SEM_PERMISSAO");
    }
    where = { modalidade: "AVALIATIVA", idTutor: aluno.idTutor };
  }
  const tarefas = await buscarTarefasDoBanco(where);
  return enriquecer(tarefas, idUsuario, papelAtivo);
}

export async function buscarTarefaVisivel(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  idTarefa: number
) {
  const tarefa = await prisma.tarefa.findUnique({
    where: { id: idTarefa },
    include: tarefaInclude,
  });
  if (!tarefa) {
    throw new ErroNegocio("Tarefa não encontrada.", 404, "TAREFA_NAO_ENCONTRADA");
  }

  let visivel = papelAtivo === "ADMINISTRADOR";
  if (papelAtivo === "TUTOR") {
    visivel = tarefa.idTutor === idUsuario || tarefa.modalidade === "GERAL";
  } else if (papelAtivo === "ALUNO") {
    const aluno = await prisma.aluno.findUnique({ where: { idUsuario } });
    visivel =
      !!aluno && tarefa.modalidade === "AVALIATIVA" && tarefa.idTutor === aluno.idTutor;
  }
  if (!visivel) {
    throw new ErroNegocio("Você não possui acesso a esta tarefa.", 403, "SEM_PERMISSAO");
  }
  const [resultado] = await enriquecer([tarefa], idUsuario, papelAtivo);
  return resultado;
}

// Só quem criou a tarefa pode alterá-la, excluí-la ou mexer nos anexos:
// o Tutor nas dele (RF08, US21) e a Administração nas atividades gerais dela.
async function obterTarefaDoCriador(idUsuario: number, papelAtivo: PapelAtivo, idTarefa: number) {
  const tarefa = await prisma.tarefa.findUnique({
    where: { id: idTarefa },
    include: { _count: { select: { redacoes: true, tarefasAplicadas: true } } },
  });
  if (!tarefa) {
    throw new ErroNegocio("Tarefa não encontrada.", 404, "TAREFA_NAO_ENCONTRADA");
  }
  const dono =
    (papelAtivo === "TUTOR" && tarefa.idTutor === idUsuario) ||
    (papelAtivo === "ADMINISTRADOR" && tarefa.idAdm === idUsuario);
  if (!dono) {
    throw new ErroNegocio(
      "Somente quem criou a tarefa pode alterá-la.",
      403,
      "SEM_PERMISSAO"
    );
  }
  return tarefa;
}

export async function atualizarTarefa(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  idTarefa: number,
  input: AtualizarTarefaInput
) {
  await obterTarefaDoCriador(idUsuario, papelAtivo, idTarefa);
  await validarTema(input.idTema, idUsuario, papelAtivo);

  return prisma.$transaction(async (tx) => {
    // Lista explícita: modalidade, turma e criador nunca mudam por aqui.
    const atualizada = await tx.tarefa.update({
      where: { id: idTarefa },
      data: {
        idTema: input.idTema,
        tituloTarefa: input.tituloTarefa,
        descricao: input.descricao,
        prazoEntrega: input.prazoEntrega,
      },
      include: tarefaInclude,
    });
    await registrarAuditoria(
      { idUsuario, acao: "TAREFA_ATUALIZADA", entidade: "TAREFA", idRegistro: idTarefa },
      tx
    );
    return atualizada;
  });
}

export async function excluirTarefa(idUsuario: number, papelAtivo: PapelAtivo, idTarefa: number) {
  const tarefa = await obterTarefaDoCriador(idUsuario, papelAtivo, idTarefa);
  if (tarefa._count.redacoes > 0) {
    throw new ErroNegocio(
      "Não é possível excluir uma tarefa com redações vinculadas.",
      409,
      "TAREFA_EM_USO"
    );
  }
  if (tarefa._count.tarefasAplicadas > 0) {
    throw new ErroNegocio(
      "Não é possível excluir uma atividade geral que já foi aplicada por tutores.",
      409,
      "TAREFA_EM_USO"
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.tarefa.delete({ where: { id: idTarefa } });
    await registrarAuditoria(
      { idUsuario, acao: "TAREFA_EXCLUIDA", entidade: "TAREFA", idRegistro: idTarefa },
      tx
    );
  });
}

// RN07: o TUTOR aplica uma atividade geral ao seu grupo. A cópia é uma tarefa
// AVALIATIVA do Tutor (é o que o aluno consegue realizar), ligada à origem.
export async function aplicarAtividadeGeral(
  idUsuarioTutor: number,
  idTarefaOrigem: number,
  prazoEntrega: Date
) {
  const tutor = await obterTutor(idUsuarioTutor);
  exigirTurmaAtiva(tutor.turma);

  const origem = await prisma.tarefa.findUnique({
    where: { id: idTarefaOrigem },
    include: { anexos: true },
  });
  if (!origem) {
    throw new ErroNegocio("Atividade geral não encontrada.", 404, "TAREFA_NAO_ENCONTRADA");
  }
  if (origem.modalidade !== "GERAL") {
    throw new ErroNegocio(
      "Somente atividades gerais podem ser aplicadas.",
      400,
      "TAREFA_INVALIDA"
    );
  }
  // Evita duplicar a mesma atividade por clique repetido.
  const jaAplicada = await prisma.tarefa.findFirst({
    where: { idTarefaOrigem: origem.id, idTutor: idUsuarioTutor },
  });
  if (jaAplicada) {
    throw new ErroNegocio(
      "Você já aplicou esta atividade ao seu grupo.",
      409,
      "TAREFA_JA_APLICADA"
    );
  }

  return prisma.$transaction(async (tx) => {
    const tarefa = await tx.tarefa.create({
      data: {
        idTutor: idUsuarioTutor,
        idTurma: tutor.idTurma,
        idTema: origem.idTema,
        idTarefaOrigem: origem.id,
        tituloTarefa: origem.tituloTarefa,
        descricao: origem.descricao,
        prazoEntrega,
        modalidade: "AVALIATIVA",
        anexos: {
          create: origem.anexos.map((anexo) => ({
            nomeArquivo: anexo.nomeArquivo,
            caminhoArquivo: anexo.caminhoArquivo,
            tipoArquivo: anexo.tipoArquivo,
          })),
        },
      },
      include: tarefaInclude,
    });
    await registrarAuditoria(
      {
        idUsuario: idUsuarioTutor,
        acao: "ATIVIDADE_GERAL_APLICADA",
        entidade: "TAREFA",
        idRegistro: tarefa.id,
        descricao: `Origem: tarefa ${origem.id}.`,
      },
      tx
    );
    return tarefa;
  });
}

// O arquivo é enviado pelo frontend direto ao Cloudinary (upload sem
// assinatura, como no projeto anterior). O backend só registra a referência
// e aceita apenas URLs do Cloudinary da conta do projeto.
function validarUrlAnexo(url: string) {
  let endereco: URL;
  try {
    endereco = new URL(url);
  } catch {
    throw new ErroNegocio("URL do anexo inválida.", 400, "ANEXO_URL_INVALIDA");
  }
  const nuvem = process.env.CLOUDINARY_CLOUD_NAME;
  const prefixo = nuvem ? `/${nuvem}/` : "/";
  if (
    endereco.protocol !== "https:" ||
    endereco.hostname !== "res.cloudinary.com" ||
    !endereco.pathname.startsWith(prefixo)
  ) {
    throw new ErroNegocio(
      "O anexo deve estar hospedado no Cloudinary do projeto.",
      400,
      "ANEXO_URL_INVALIDA"
    );
  }
}

export async function adicionarAnexo(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  idTarefa: number,
  input: AnexoInput
) {
  await obterTarefaDoCriador(idUsuario, papelAtivo, idTarefa);
  if (!TIPOS_ANEXO_PERMITIDOS.includes(input.tipoArquivo)) {
    throw new ErroNegocio(
      "Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WEBP.",
      400,
      "ANEXO_TIPO_INVALIDO"
    );
  }
  validarUrlAnexo(input.url);

  return prisma.$transaction(async (tx) => {
    const anexo = await tx.anexo.create({
      data: {
        idTarefa,
        nomeArquivo: input.nomeArquivo,
        caminhoArquivo: input.url,
        tipoArquivo: input.tipoArquivo,
      },
    });
    await registrarAuditoria(
      { idUsuario, acao: "ANEXO_ADICIONADO", entidade: "ANEXO", idRegistro: anexo.id },
      tx
    );
    return anexo;
  });
}

export async function removerAnexo(
  idUsuario: number,
  papelAtivo: PapelAtivo,
  idTarefa: number,
  idAnexo: number
) {
  await obterTarefaDoCriador(idUsuario, papelAtivo, idTarefa);
  const anexo = await prisma.anexo.findFirst({ where: { id: idAnexo, idTarefa } });
  if (!anexo) {
    throw new ErroNegocio("Anexo não encontrado.", 404, "ANEXO_NAO_ENCONTRADO");
  }
  await prisma.$transaction(async (tx) => {
    await tx.anexo.delete({ where: { id: idAnexo } });
    await registrarAuditoria(
      { idUsuario, acao: "ANEXO_REMOVIDO", entidade: "ANEXO", idRegistro: idAnexo },
      tx
    );
  });
}
