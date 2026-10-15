import type { NextFunction, Request, Response } from "express";
import { ErroValidacao } from "../errors/erros";
import type { RequestAutenticada } from "../middlewares/auth.middleware";
import { gerarLinkParaAdministracao, redefinirSenha, solicitarRecuperacao } from "../services/recuperacao-senha.service";

function corpo(req: Request): Record<string, unknown> {
  return typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
}

// POST /auth/esqueci-senha  { email }
export async function esqueciSenha(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = corpo(req);
    if (typeof email !== "string" || !email.trim()) {
      throw new ErroValidacao([{ campo: "email", mensagem: "Informe o e-mail." }]);
    }
    res.status(200).json(await solicitarRecuperacao(email));
  } catch (erro) { next(erro); }
}

// POST /auth/redefinir-senha  { token, novaSenha }
export async function redefinirSenhaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, novaSenha } = corpo(req);
    const detalhes: { campo: string; mensagem: string }[] = [];
    if (typeof token !== "string" || !token.trim() || token.length > 2000) {
      detalhes.push({ campo: "token", mensagem: "Informe o token recebido por e-mail." });
    }
    // A senha não passa por trim: espaços fazem parte dela.
    if (typeof novaSenha !== "string" || !novaSenha) {
      detalhes.push({ campo: "novaSenha", mensagem: "Informe a nova senha." });
    }
    if (detalhes.length) throw new ErroValidacao(detalhes);
    res.status(200).json(await redefinirSenha((token as string).trim(), novaSenha as string));
  } catch (erro) { next(erro); }
}

// POST /usuarios/:idUsuario/link-redefinicao  (somente Administração)
export async function postLinkRedefinicao(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = (req as RequestAutenticada).autenticacao;
    const idUsuario = Number(req.params.idUsuario);
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      throw new ErroValidacao([{ campo: "idUsuario", mensagem: "Informe um identificador inteiro positivo." }]);
    }
    res.status(201).json(await gerarLinkParaAdministracao(auth.idUsuario, idUsuario));
  } catch (erro) { next(erro); }
}
