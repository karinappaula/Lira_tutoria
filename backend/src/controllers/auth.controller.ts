import type { NextFunction, Request, Response } from "express";
import { autenticar, selecionarPapel } from "../services/login.service";
import { cadastrarViaConvite } from "../services/cadastro.service";
import type { PapelAtivo } from "../services/token.service";
import { ErroValidacao, type DetalheValidacao } from "../errors/erros";

const PAPEIS: readonly PapelAtivo[] = ["ADMINISTRADOR", "TUTOR", "ALUNO"];
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Limites que espelham o banco: USUARIO.email/nome VARCHAR(150), CONVITE.codigo VARCHAR(10).
const MAX_EMAIL = 150;
const MAX_NOME = 150;
const MAX_CODIGO_CONVITE = 10;
// O bcrypt ignora silenciosamente tudo além de 72 bytes.
const MAX_BYTES_SENHA = 72;
const MAX_TOKEN = 2000;

// ---------- Leitura/validação do corpo ----------

function corpo(req: Request): Record<string, unknown> {
  const b: unknown = req.body;
  return typeof b === "object" && b !== null && !Array.isArray(b)
    ? (b as Record<string, unknown>)
    : {};
}

function estaVazio(valor: unknown): boolean {
  return valor === undefined || valor === null || (typeof valor === "string" && valor.trim() === "");
}

function lerTexto(
  valor: unknown,
  campo: string,
  max: number,
  detalhes: DetalheValidacao[]
): string | undefined {
  if (typeof valor !== "string") {
    detalhes.push({ campo, mensagem: "Deve ser um texto." });
    return undefined;
  }
  const texto = valor.trim();
  if (texto.length > max) {
    detalhes.push({ campo, mensagem: `Máximo de ${max} caracteres.` });
    return undefined;
  }
  return texto;
}

function textoObrigatorio(valor: unknown, campo: string, max: number, d: DetalheValidacao[]): string {
  if (estaVazio(valor)) {
    d.push({ campo, mensagem: "Campo obrigatório." });
    return "";
  }
  return lerTexto(valor, campo, max, d) ?? "";
}

function textoOpcional(valor: unknown, campo: string, max: number, d: DetalheValidacao[]): string | undefined {
  return estaVazio(valor) ? undefined : lerTexto(valor, campo, max, d);
}

function emailObrigatorio(valor: unknown, d: DetalheValidacao[]): string {
  const email = textoObrigatorio(valor, "email", MAX_EMAIL, d);
  if (email && !REGEX_EMAIL.test(email)) {
    d.push({ campo: "email", mensagem: "E-mail inválido." });
    return "";
  }
  return email;
}

// A senha NUNCA passa por trim: espaços fazem parte dela.
function senhaTexto(valor: unknown, obrigatoria: boolean, limitar: boolean, d: DetalheValidacao[]): string | undefined {
  if (valor === undefined || valor === null || valor === "") {
    if (obrigatoria) d.push({ campo: "senha", mensagem: "Campo obrigatório." });
    return undefined;
  }
  if (typeof valor !== "string") {
    d.push({ campo: "senha", mensagem: "Deve ser um texto." });
    return undefined;
  }
  if (limitar && Buffer.byteLength(valor, "utf8") > MAX_BYTES_SENHA) {
    d.push({ campo: "senha", mensagem: `A senha deve ter no máximo ${MAX_BYTES_SENHA} bytes.` });
    return undefined;
  }
  return valor;
}

function exigirValido(detalhes: DetalheValidacao[]): void {
  if (detalhes.length > 0) throw new ErroValidacao(detalhes);
}

// ---------- Handlers ----------

// POST /auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const b = corpo(req);
    const d: DetalheValidacao[] = [];
    const email = emailObrigatorio(b.email, d);
    const senha = senhaTexto(b.senha, true, false, d) ?? "";
    exigirValido(d);

    const resultado = await autenticar(email, senha);
    res.status(200).json(resultado);
  } catch (erro) {
    next(erro);
  }
}

// POST /auth/cadastro
export async function cadastro(req: Request, res: Response, next: NextFunction) {
  try {
    const b = corpo(req);
    const d: DetalheValidacao[] = [];
    const codigo = textoObrigatorio(b.codigo, "codigo", MAX_CODIGO_CONVITE, d);
    const email = emailObrigatorio(b.email, d);
    const nome = textoOpcional(b.nome, "nome", MAX_NOME, d);
    const senha = senhaTexto(b.senha, false, true, d);
    exigirValido(d);

    const resultado = await cadastrarViaConvite({ codigo, email, nome, senha });
    res.status(201).json(resultado);
  } catch (erro) {
    next(erro);
  }
}

// POST /auth/selecionar-papel
// O token temporário vai no corpo (e não no header Authorization) para que o
// header continue reservado só a tokens de sessão completa.
export async function selecionarPapelHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const b = corpo(req);
    const d: DetalheValidacao[] = [];
    const tokenPendente = textoObrigatorio(b.tokenPendente, "tokenPendente", MAX_TOKEN, d);

    let papel: PapelAtivo | undefined;
    if (estaVazio(b.papel)) {
      d.push({ campo: "papel", mensagem: "Campo obrigatório." });
    } else if (typeof b.papel !== "string" || !PAPEIS.includes(b.papel as PapelAtivo)) {
      d.push({ campo: "papel", mensagem: `Papel inválido. Use: ${PAPEIS.join(", ")}.` });
    } else {
      papel = b.papel as PapelAtivo;
    }
    exigirValido(d);

    const resultado = await selecionarPapel(tokenPendente, papel as PapelAtivo);
    res.status(200).json(resultado);
  } catch (erro) {
    next(erro);
  }
}
