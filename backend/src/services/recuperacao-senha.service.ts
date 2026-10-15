import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";
import { ErroNegocio } from "../errors/erros";
import { registrarAuditoria } from "./auditoria.service";
import { enviarEmail } from "./email.service";
import { gerarHashSenha } from "./senha.service";

const JWT_SECRET = process.env.JWT_SECRET ?? "";
const VALIDADE_DO_LINK = "1h";
const SENHA_MIN_CARACTERES = 8;
const SENHA_MAX_BYTES = 72; // limite do bcrypt
const LIMITE_POR_HORA = 3;
const JANELA_MS = 60 * 60 * 1000;

const MENSAGEM_PADRAO =
  "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.";

// O link de recuperação é um JWT assinado com o segredo do sistema JUNTO com
// o hash da senha atual. Quando a senha muda, o hash muda e o link antigo
// deixa de valer. Resultado: uso único e expiração, sem tabela extra (RF01).
function chaveDoToken(senhaHash: string) {
  return `${JWT_SECRET}.${senhaHash}`;
}

// Limite simples em memória: no máximo 3 pedidos por e-mail por hora.
const pedidos = new Map<string, number[]>();
function limiteExcedido(email: string): boolean {
  const agora = Date.now();
  if (pedidos.size > 1000) {
    for (const [chave, marcas] of pedidos) {
      if (marcas.every((marca) => agora - marca >= JANELA_MS)) pedidos.delete(chave);
    }
  }
  const recentes = (pedidos.get(email) ?? []).filter((marca) => agora - marca < JANELA_MS);
  if (recentes.length >= LIMITE_POR_HORA) {
    pedidos.set(email, recentes);
    return true;
  }
  recentes.push(agora);
  pedidos.set(email, recentes);
  return false;
}

function criarToken(usuario: { id: number; senhaHash: string }): string {
  return jwt.sign({ tipo: "recuperacao_senha", idUsuario: usuario.id }, chaveDoToken(usuario.senhaHash), {
    expiresIn: VALIDADE_DO_LINK,
  });
}

function linkDeRedefinicao(token: string): string {
  const base = process.env.FRONTEND_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!base) throw new Error("FRONTEND_URL não foi configurado.");
  return `${base.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

// A resposta é SEMPRE a mesma, exista ou não o e-mail, para que ninguém
// descubra quais e-mails estão cadastrados. O envio roda em segundo plano
// para o tempo de resposta também não revelar nada.
export async function solicitarRecuperacao(email: string): Promise<{ mensagem: string }> {
  const emailNormalizado = email.trim().toLowerCase();
  if (!emailNormalizado || emailNormalizado.length > 150 || limiteExcedido(emailNormalizado)) {
    return { mensagem: MENSAGEM_PADRAO };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: emailNormalizado } });
  if (usuario && usuario.status === "ATIVO") {
    const token = criarToken(usuario);
    void (async () => {
      try {
        await enviarEmail({
          para: usuario.email,
          assunto: "LIRA Tutoria: redefinição de senha",
          texto:
            `Olá, ${usuario.nome}.\n\n` +
            `Recebemos um pedido para redefinir a senha da sua conta na plataforma LIRA Tutoria.\n` +
            `Para criar uma nova senha, acesse o link abaixo (válido por 1 hora):\n\n` +
            `${linkDeRedefinicao(token)}\n\n` +
            `Se você não fez esse pedido, ignore esta mensagem: sua senha continua a mesma.`,
        });
        await registrarAuditoria({
          idUsuario: usuario.id,
          acao: "SENHA_RECUPERACAO_SOLICITADA",
          entidade: "USUARIO",
          idRegistro: usuario.id,
        });
      } catch (erro) {
        console.error("Falha ao enviar o e-mail de recuperação de senha:", erro);
      }
    })();
  }
  return { mensagem: MENSAGEM_PADRAO };
}

function linkInvalido(): never {
  throw new ErroNegocio(
    "O link de redefinição é inválido ou expirou. Solicite um novo.",
    400,
    "LINK_INVALIDO"
  );
}

export async function redefinirSenha(token: string, novaSenha: string) {
  if (novaSenha.length < SENHA_MIN_CARACTERES) {
    throw new ErroNegocio(
      `A nova senha deve ter pelo menos ${SENHA_MIN_CARACTERES} caracteres.`,
      400,
      "SENHA_FRACA"
    );
  }
  if (Buffer.byteLength(novaSenha, "utf8") > SENHA_MAX_BYTES) {
    throw new ErroNegocio(`A nova senha deve ter no máximo ${SENHA_MAX_BYTES} bytes.`, 400, "SENHA_LONGA");
  }

  // Lê o conteúdo para saber de quem é o link; só vale depois do verify abaixo.
  const conteudo = jwt.decode(token);
  if (
    typeof conteudo !== "object" ||
    conteudo === null ||
    conteudo.tipo !== "recuperacao_senha" ||
    !Number.isInteger(conteudo.idUsuario)
  ) {
    return linkInvalido();
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: conteudo.idUsuario as number } });
  if (!usuario || usuario.status !== "ATIVO") return linkInvalido();

  try {
    jwt.verify(token, chaveDoToken(usuario.senhaHash));
  } catch {
    return linkInvalido();
  }

  const senhaHash = await gerarHashSenha(novaSenha);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: usuario.id }, data: { senhaHash } });
    await registrarAuditoria(
      { idUsuario: usuario.id, acao: "SENHA_REDEFINIDA", entidade: "USUARIO", idRegistro: usuario.id },
      tx
    );
  });
  return { mensagem: "Senha redefinida com sucesso. Entre com a nova senha." };
}

// Alternativa sem e-mail: a Administração gera o link e entrega pessoalmente,
// por WhatsApp ou Teams. É o mesmo link de uso único, válido por 1 hora.
// Contas da própria Administração não entram aqui (usam o e-mail), para que
// ninguém assuma a conta de outro administrador.
export async function gerarLinkParaAdministracao(idAdmin: number, idUsuario: number) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: idUsuario },
    include: { administrador: { select: { idUsuario: true } } },
  });
  if (!usuario) {
    throw new ErroNegocio("Usuário não encontrado.", 404, "USUARIO_NAO_ENCONTRADO");
  }
  if (usuario.administrador) {
    throw new ErroNegocio(
      "Contas da Administração recuperam a senha pelo e-mail.",
      409,
      "CONTA_ADMINISTRADORA"
    );
  }
  if (usuario.status !== "ATIVO") {
    throw new ErroNegocio("A conta está inativa.", 409, "CONTA_INATIVA");
  }

  const link = linkDeRedefinicao(criarToken(usuario));
  await registrarAuditoria({
    idUsuario: idAdmin,
    acao: "LINK_REDEFINICAO_GERADO",
    entidade: "USUARIO",
    idRegistro: usuario.id,
  });
  return {
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    link,
    validoPor: "1 hora, uso único",
  };
}
