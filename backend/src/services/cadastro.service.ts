import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { conferirSenha, gerarHashSenha } from "./senha.service";
import { MAX_TUTORES_POR_TURMA, MAX_TUTORADOS_POR_TUTOR } from "../config/limitesNegocio";
import { ErroNegocio } from "../errors/erros";

interface CadastrarViaConviteInput {
  codigo: string;
  email: string;
  nome?: string;
  senha?: string;
}

interface ResultadoCadastro {
  idUsuario: number;
  papelAtribuido: "TUTOR" | "ALUNO";
  contaJaExistia: boolean;
}

/**
 * Realiza o cadastro ou vínculo de usuário a partir de um código de convite.
 * Executado dentro de uma transação atômica (prisma.$transaction) para garantir
 * que falhas em qualquer etapa revertam a criação de contas ou alteração de convites.
 *
 * Violações de regra de negócio lançam ErroNegocio (status HTTP + código para o front).
 */
export async function cadastrarViaConvite(
  input: CadastrarViaConviteInput
): Promise<ResultadoCadastro> {
  const emailNormalizado = input.email.trim().toLowerCase();
  const codigoNormalizado = input.codigo.trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    // 1. Buscar e validar convite
    const convite = await tx.convite.findUnique({ where: { codigo: codigoNormalizado } });

    if (!convite) {
      throw new ErroNegocio(
        "Convite não encontrado. Confira o código recebido.",
        404,
        "CONVITE_NAO_ENCONTRADO"
      );
    }
    if (convite.expiraEm < new Date()) {
      throw new ErroNegocio("Este convite expirou. Peça um novo link.", 400, "CONVITE_EXPIRADO");
    }

    if (convite.papel === "ALUNO") {
      if (!convite.idTutor) {
        throw new ErroNegocio(
          "O convite de aluno precisa estar associado a um tutor válido.",
          400,
          "CONVITE_INVALIDO"
        );
      }
      // Regra de limite de 10 vagas validada via contagem de alunos ativos vinculados ao idTutor
      const alunosAtivos = await tx.aluno.count({
        where: { idTutor: convite.idTutor, usuario: { status: "ATIVO" } },
      });
      if (alunosAtivos >= MAX_TUTORADOS_POR_TUTOR) {
        throw new ErroNegocio(
          `O limite de vagas deste tutor foi atingido (${MAX_TUTORADOS_POR_TUTOR} alunos ativos vinculados). Novos cadastros estão bloqueados.`,
          409,
          "LIMITE_ATINGIDO"
        );
      }
    } else {
      if (convite.usado || convite.usos >= convite.usosMaximos) {
        throw new ErroNegocio("Este convite já atingiu o limite máximo de utilizações.", 409, "CONVITE_USADO");
      }
    }

    // 2. Buscar ou criar o usuário
    let usuario = await tx.usuario.findUnique({ where: { email: emailNormalizado } });
    const contaJaExistia = !!usuario;

    // Impedir que um Tutor tente se cadastrar como aluno (próprio link ou perfil de tutor)
    if (convite.papel === "ALUNO" && usuario) {
      if (usuario.id === convite.idTutor) {
        throw new ErroNegocio(
          "Você é o tutor responsável por este convite e não pode se cadastrar como seu próprio aluno.",
          400,
          "TUTOR_AUTO_CADASTRO"
        );
      }
      const perfilTutor = await tx.tutor.findUnique({ where: { idUsuario: usuario.id } });
      if (perfilTutor) {
        throw new ErroNegocio(
          "Contas com perfil de Tutor não podem utilizar convites de aluno.",
          400,
          "PERFIL_INCOMPATIVEL"
        );
      }
    }

    if (!usuario) {
      if (!input.nome || !input.senha) {
        throw new ErroNegocio(
          "Nome e senha são obrigatórios para criar uma nova conta.",
          400,
          "DADOS_INCOMPLETOS"
        );
      }
      const senhaHash = await gerarHashSenha(input.senha);
      usuario = await tx.usuario.create({
        data: {
          nome: input.nome.trim(),
          email: emailNormalizado,
          senhaHash,
        },
      });
    } else {
      // Conta já existia: precisa validar a senha atual fornecida para autorizar o vínculo do novo papel
      if (!input.senha) {
        throw new ErroNegocio(
          "Informe a sua senha atual para vincular o novo perfil à sua conta.",
          400,
          "SENHA_OBRIGATORIA"
        );
      }
      const senhaValida = await conferirSenha(input.senha, usuario.senhaHash);
      if (!senhaValida) {
        throw new ErroNegocio(
          "Senha incorreta. Confirme a senha atual da sua conta para autorizar o vínculo.",
          401,
          "CREDENCIAIS_INVALIDAS"
        );
      }
      if (usuario.status !== "ATIVO") {
        throw new ErroNegocio(
          "Esta conta está inativa. Fale com a Administração.",
          403,
          "CONTA_INATIVA"
        );
      }
    }

    // 3. Anexar o papel correspondente (na mesma transação)
    if (convite.papel === "TUTOR") {
      await anexarPapelTutor(tx, usuario.id, convite.idTurma);
    } else if (convite.papel === "ALUNO") {
      await anexarPapelAluno(tx, usuario.id, convite.idTutor!);
    } else {
      throw new ErroNegocio(
        `Papel de convite desconhecido: ${convite.papel}`,
        400,
        "CONVITE_INVALIDO"
      );
    }

    // 4. Atualizar usos do convite e status de usado
    if (convite.papel === "ALUNO") {
      const alunosAtivosAposCadastro = await tx.aluno.count({
        where: { idTutor: convite.idTutor!, usuario: { status: "ATIVO" } },
      });
      const agoraUsado = alunosAtivosAposCadastro >= MAX_TUTORADOS_POR_TUTOR;
      await tx.convite.update({
        where: { codigo: convite.codigo },
        data: {
          usos: alunosAtivosAposCadastro,
          usado: agoraUsado,
        },
      });
    } else {
      const novosUsos = convite.usos + 1;
      const agoraUsado = novosUsos >= convite.usosMaximos;
      await tx.convite.update({
        where: { codigo: convite.codigo },
        data: {
          usos: novosUsos,
          usado: agoraUsado,
        },
      });
    }

    return {
      idUsuario: usuario.id,
      papelAtribuido: convite.papel as "TUTOR" | "ALUNO",
      contaJaExistia,
    };
  });
}

/**
 * Anexa o papel de Tutor ao usuário, vinculando-o à Turma (Schema V3 - 3NF).
 * Impede a troca automática de turma via convite para evitar reatribuição indesejada de alunos.
 */
async function anexarPapelTutor(
  tx: Prisma.TransactionClient,
  idUsuario: number,
  idTurma: number
) {
  const tutorExistente = await tx.tutor.findUnique({ where: { idUsuario } });

  if (!tutorExistente) {
    const quantidadeTutoresNaTurma = await tx.tutor.count({ where: { idTurma } });
    if (quantidadeTutoresNaTurma >= MAX_TUTORES_POR_TURMA) {
      throw new ErroNegocio(
        `Esta turma já atingiu o limite de ${MAX_TUTORES_POR_TURMA} tutores.`,
        409,
        "LIMITE_ATINGIDO"
      );
    }

    await tx.tutor.create({ data: { idUsuario, idTurma } });
    return;
  }

  if (tutorExistente.idTurma === idTurma) {
    return; // Idempotente: já está vinculado a essa mesma turma
  }

  // Se já é Tutor em outra turma, bloqueia a movimentação automática
  const turmaAtual = await tx.turma.findUnique({ where: { id: tutorExistente.idTurma } });
  throw new ErroNegocio(
    `Este tutor já está vinculado à turma "${turmaAtual?.nome ?? tutorExistente.idTurma}". ` +
      "Para transferi-lo para outra turma, fale com a Administração.",
    409,
    "VINCULO_EXISTENTE"
  );
}

/**
 * Anexa o papel de Aluno ao usuário, vinculando-o ao Tutor (Schema V3 - 3NF).
 */
async function anexarPapelAluno(
  tx: Prisma.TransactionClient,
  idUsuario: number,
  idTutor: number
) {
  if (idUsuario === idTutor) {
    throw new ErroNegocio(
      "Você é o tutor responsável por este convite e não pode se cadastrar como seu próprio aluno.",
      400,
      "TUTOR_AUTO_CADASTRO"
    );
  }

  const tutorExistente = await tx.tutor.findUnique({ where: { idUsuario } });
  if (tutorExistente) {
    throw new ErroNegocio(
      "Contas com perfil de Tutor não podem ser vinculadas como aluno.",
      400,
      "PERFIL_INCOMPATIVEL"
    );
  }

  const alunoExistente = await tx.aluno.findUnique({ where: { idUsuario } });

  if (alunoExistente) {
    throw new ErroNegocio(
      "Esta conta já possui um vínculo de Aluno ativo. " +
        "Para trocar de turma/tutor, fale com a Administração.",
      409,
      "VINCULO_EXISTENTE"
    );
  }

  const quantidadeTutoradosDoTutor = await tx.aluno.count({
    where: { idTutor, usuario: { status: "ATIVO" } },
  });
  if (quantidadeTutoradosDoTutor >= MAX_TUTORADOS_POR_TUTOR) {
    throw new ErroNegocio(
      `O limite de vagas deste tutor foi atingido (${MAX_TUTORADOS_POR_TUTOR} alunos ativos vinculados). Novos cadastros estão bloqueados.`,
      409,
      "LIMITE_ATINGIDO"
    );
  }

  await tx.aluno.create({ data: { idUsuario, idTutor } });
}
