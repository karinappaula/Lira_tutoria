import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "";
const EXPIRACAO_SESSAO = process.env.JWT_EXPIRES_IN ?? "7d";
const EXPIRACAO_SELECAO_PENDENTE = "10m"; // janela curta só pra escolher o papel

if (!JWT_SECRET.trim()) {
  throw new Error("JWT_SECRET não foi configurado.");
}

export type PapelAtivo = "ADMINISTRADOR" | "TUTOR" | "ALUNO";

export class ErroTokenInvalido extends Error {
  constructor(message = "Token inválido ou expirado.") {
    super(message);
    this.name = "ErroTokenInvalido";
  }
}

// Payload de uma sessão JÁ com o papel escolhido — é o que protege as rotas.
export interface PayloadSessao {
  tipo: "sessao";
  idUsuario: number;
  papelAtivo: PapelAtivo;
}

// Payload temporário: login validado, mas ainda falta escolher o papel
// (conta com mais de um vínculo — ex: Tutor e também Aluno).
export interface PayloadSelecaoPendente {
  tipo: "selecao_pendente";
  idUsuario: number;
}

export function gerarTokenSessao(idUsuario: number, papelAtivo: PapelAtivo): string {
  const payload: PayloadSessao = { tipo: "sessao", idUsuario, papelAtivo };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: EXPIRACAO_SESSAO as jwt.SignOptions["expiresIn"],
  });
}

export function gerarTokenSelecaoPendente(idUsuario: number): string {
  const payload: PayloadSelecaoPendente = { tipo: "selecao_pendente", idUsuario };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: EXPIRACAO_SELECAO_PENDENTE as jwt.SignOptions["expiresIn"],
  });
}

function ehPapelAtivo(valor: unknown): valor is PapelAtivo {
  return (
    valor === "ADMINISTRADOR" ||
    valor === "TUTOR" ||
    valor === "ALUNO"
  );
}

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function ehPayloadSessao(valor: unknown): valor is PayloadSessao {
  return (
    ehRegistro(valor) &&
    valor.tipo === "sessao" &&
    typeof valor.idUsuario === "number" &&
    Number.isInteger(valor.idUsuario) &&
    valor.idUsuario > 0 &&
    ehPapelAtivo(valor.papelAtivo)
  );
}

function ehPayloadSelecaoPendente(valor: unknown): valor is PayloadSelecaoPendente {
  return (
    ehRegistro(valor) &&
    valor.tipo === "selecao_pendente" &&
    typeof valor.idUsuario === "number" &&
    Number.isInteger(valor.idUsuario) &&
    valor.idUsuario > 0
  );
}

// Verifica assinatura, expiração e formato do payload de qualquer token.
export function verificarToken(token: string): PayloadSessao | PayloadSelecaoPendente {
  let payload: unknown;

  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new ErroTokenInvalido();
  }

  if (ehPayloadSessao(payload) || ehPayloadSelecaoPendente(payload)) {
    return payload;
  }

  throw new ErroTokenInvalido("Payload de token inválido.");
}

// Garante que o token pertence especificamente ao fluxo de seleção de papel.
export function verificarTokenSelecaoPendente(token: string): PayloadSelecaoPendente {
  const payload = verificarToken(token);

  if (!ehPayloadSelecaoPendente(payload)) {
    throw new ErroTokenInvalido("O token não é válido para seleção de papel.");
  }

  return payload;
}