import { prisma } from "../db/prisma";
import { conferirSenha, gerarHashSenha } from "./senha.service";
import {
  gerarTokenSessao,
  gerarTokenSelecaoPendente,
  ErroTokenInvalido,
  verificarTokenSelecaoPendente,
  type PapelAtivo,
} from "./token.service";

// ---------- Erros ----------

// "codigo" permite que o controller escolha o status HTTP sem depender
// do texto da mensagem.
export class ErroAutenticacao extends Error {
  constructor(
    message: string,
    public readonly codigo:
      | "CREDENCIAIS_INVALIDAS"
      | "CONTA_INATIVA"
      | "SEM_PAPEL"
      | "TOKEN_INVALIDO"
  ) {
    super(message);
    this.name = "ErroAutenticacao";
  }
}

// ---------- Tipos de retorno ----------

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
}

export interface LoginComSessao {
  tipo: "sessao";
  token: string;
  papelAtivo: PapelAtivo;
  usuario: UsuarioLogado;
}

export interface LoginComSelecaoPendente {
  tipo: "selecao_pendente";
  token: string; // token temporário (10 min), só serve para escolher o papel
  papeisDisponiveis: PapelAtivo[];
  usuario: UsuarioLogado;
}

export type ResultadoLogin = LoginComSessao | LoginComSelecaoPendente;

// ---------- Helpers ----------

// Hash descartável, usado só para gastar o mesmo tempo de bcrypt quando o
// e-mail não existe. Sem isso, "e-mail inexistente" responde mais rápido que
// "senha errada", e dá para descobrir quais e-mails estão cadastrados.
let hashFalso: Promise<string> | null = null;
function obterHashFalso(): Promise<string> {
  if (!hashFalso) hashFalso = gerarHashSenha("senha-falsa-para-igualar-tempo");
  return hashFalso;
}

/**
 * Descobre quais papéis uma conta possui, consultando as tabelas de
 * especialização 1:1 (ADMINISTRADOR, TUTOR, ALUNO), que usam id_usuario como PK.
 * Exportada porque o "selecionar papel" (próximo passo) vai reutilizá-la.
 */
export async function buscarPapeisDoUsuario(idUsuario: number): Promise<PapelAtivo[]> {
  const [admin, tutor, aluno] = await Promise.all([
    prisma.administrador.findUnique({ where: { idUsuario } }),
    prisma.tutor.findUnique({ where: { idUsuario } }),
    prisma.aluno.findUnique({ where: { idUsuario } }),
  ]);

  const papeis: PapelAtivo[] = [];
  if (admin) papeis.push("ADMINISTRADOR");
  if (tutor) papeis.push("TUTOR");
  if (aluno) papeis.push("ALUNO");
  return papeis;
}

// ---------- Login ----------

export async function autenticar(email: string, senha: string): Promise<ResultadoLogin> {
  const emailNormalizado = email.trim().toLowerCase();

  const usuario = await prisma.usuario.findUnique({ where: { email: emailNormalizado } });

  // Sempre roda o bcrypt, existindo ou não o usuário (ver obterHashFalso).
  const hashParaComparar = usuario ? usuario.senhaHash : await obterHashFalso();
  const senhaConfere = await conferirSenha(senha, hashParaComparar);

  // Mesma mensagem para "e-mail não existe" e "senha errada".
  if (!usuario || !senhaConfere) {
    throw new ErroAutenticacao("E-mail ou senha incorretos.", "CREDENCIAIS_INVALIDAS");
  }

  // Só depois de provar a senha revelamos o estado da conta.
  if (usuario.status !== "ATIVO") {
    throw new ErroAutenticacao(
      "Esta conta está inativa. Fale com a Administração.",
      "CONTA_INATIVA"
    );
  }

  const papeis = await buscarPapeisDoUsuario(usuario.id);

  if (papeis.length === 0) {
    throw new ErroAutenticacao(
      "Esta conta ainda não possui um papel atribuído. Fale com a Administração.",
      "SEM_PAPEL"
    );
  }

  const dadosUsuario: UsuarioLogado = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  };

  // 1 papel: entra direto
  if (papeis.length === 1) {
    return {
      tipo: "sessao",
      token: gerarTokenSessao(usuario.id, papeis[0]),
      papelAtivo: papeis[0],
      usuario: dadosUsuario,
    };
  }

  // 2+ papéis: token temporário, o usuário escolhe depois
  return {
    tipo: "selecao_pendente",
    token: gerarTokenSelecaoPendente(usuario.id),
    papeisDisponiveis: papeis,
    usuario: dadosUsuario,
  };
}

/**
 * Conclui o login de uma conta que possui mais de um papel.
 * O papel é consultado novamente no banco para não confiar em uma lista
 * antiga enviada pelo cliente ou obtida em um login anterior.
 */
export async function selecionarPapel(
  tokenPendente: string,
  papelEscolhido: PapelAtivo
): Promise<LoginComSessao> {
  let payload;

  try {
    payload = verificarTokenSelecaoPendente(tokenPendente);
  } catch (erro) {
    if (erro instanceof ErroTokenInvalido) {
      throw new ErroAutenticacao(
        "Token de seleção inválido ou expirado.",
        "TOKEN_INVALIDO"
      );
    }
    throw erro;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.idUsuario },
  });

  if (!usuario || usuario.status !== "ATIVO") {
    throw new ErroAutenticacao(
      "Usuário inativo ou não encontrado.",
      "CONTA_INATIVA"
    );
  }

  const papeisAtuais = await buscarPapeisDoUsuario(usuario.id);

  if (!papeisAtuais.includes(papelEscolhido)) {
    throw new ErroAutenticacao(
      "Papel inválido ou você não possui permissão para acessá-lo.",
      "TOKEN_INVALIDO"
    );
  }

  return {
    tipo: "sessao",
    token: gerarTokenSessao(usuario.id, papelEscolhido),
    papelAtivo: papelEscolhido,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    },
  };
}