/// <reference types="jest" />
import * as http from "node:http";
import { app } from "../app";
import { prisma } from "../db/prisma";
import { gerarTokenSessao } from "../services/token.service";

jest.mock("../db/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    usuario: { findUnique: jest.fn() },
    aluno: { findUnique: jest.fn() },
    tema: { findUnique: jest.fn() },
    redacao: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    versaoRedacao: { update: jest.fn() },
    auditoria: { create: jest.fn() },
  },
}));

const db = prisma as unknown as {
  $transaction: jest.Mock;
  usuario: Record<string, jest.Mock>;
  aluno: Record<string, jest.Mock>;
  tema: Record<string, jest.Mock>;
  redacao: Record<string, jest.Mock>;
  versaoRedacao: Record<string, jest.Mock>;
};

let server: ReturnType<typeof app.listen>;
let port: number;

interface ApiResponse {
  status: number;
  body: Record<string, unknown> | undefined;
}

function request(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {}
): Promise<ApiResponse> {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          ...(body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {}),
          ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const responseText = Buffer.concat(chunks).toString("utf8");
            const parsed: unknown = responseText ? JSON.parse(responseText) : undefined;
            resolve({
              status: res.statusCode ?? 0,
              body:
                typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
                  ? (parsed as Record<string, unknown>)
                  : undefined,
          });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

describe("Integração HTTP da API de redações", () => {
  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("O servidor de teste não informou uma porta TCP.");
    }
    port = address.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  beforeEach(() => jest.clearAllMocks());

  it("CT008 cria, salva e envia uma redação percorrendo três endpoints", async () => {
    const conteudoTexto = Array.from({ length: 8 }, (_, index) => `Linha ${index + 1}`).join("\n");
    db.usuario.findUnique.mockResolvedValue({ status: "ATIVO" });
    db.aluno.findUnique.mockResolvedValue({
      idUsuario: 9,
      idTutor: 7,
      tutor: { turma: { status: "ATIVA" } },
    });
    db.tema.findUnique.mockResolvedValue({
      id: 4,
      idCriador: null,
      origem: "OFICIAL",
    });

    const redacaoCriada = {
      id: 3,
      idAluno: 9,
      idTema: 4,
      tarefa: null,
      tema: { id: 4, tituloTema: "Tema de teste" },
      versoes: [{ id: 20, numeroVersao: 1, statusVersao: "RASCUNHO", conteudoTexto: "" }],
    };
    const criarTransaction = {
      redacao: { create: jest.fn().mockResolvedValue(redacaoCriada) },
    };
    db.$transaction.mockImplementationOnce(
      (callback: (tx: typeof criarTransaction) => unknown) => callback(criarTransaction)
    );

    const criarResponse = await request("POST", "/redacoes", {
      token: gerarTokenSessao(9, "ALUNO"),
      body: { tipoFluxo: "TREINO", idTema: 4 },
    });

    expect(criarResponse.status).toBe(201);
    expect(criarResponse.body).toMatchObject({ id: 3, idAluno: 9 });
    expect(criarTransaction.redacao.create).toHaveBeenCalled();

    db.redacao.findUnique
      .mockResolvedValueOnce({
        id: 3,
        idAluno: 9,
        versoes: [{ id: 20, numeroVersao: 1, statusVersao: "RASCUNHO" }],
      })
      .mockResolvedValueOnce({
        id: 3,
        idAluno: 9,
        tarefa: null,
        versoes: [{
          id: 20,
          numeroVersao: 1,
          statusVersao: "RASCUNHO",
          conteudoTexto,
        }],
      });
    db.versaoRedacao.update.mockResolvedValueOnce({ id: 20, conteudoTexto });

    const autosaveResponse = await request("PATCH", "/redacoes/3/rascunho", {
      token: gerarTokenSessao(9, "ALUNO"),
      body: { conteudoTexto },
    });

    expect(autosaveResponse.status).toBe(200);
    expect(autosaveResponse.body).toMatchObject({ id: 20, conteudoTexto });

    const transaction = {
      versaoRedacao: {
        update: jest.fn().mockResolvedValue({ id: 20, statusVersao: "ENVIADA" }),
      },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
    };
    db.$transaction.mockImplementationOnce(
      (callback: (tx: typeof transaction) => unknown) => callback(transaction)
    );

    const enviarResponse = await request("POST", "/redacoes/3/enviar", {
      token: gerarTokenSessao(9, "ALUNO"),
    });

    expect(enviarResponse.status).toBe(200);
    expect(enviarResponse.body).toMatchObject({ id: 20, statusVersao: "ENVIADA" });
    expect(transaction.versaoRedacao.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 20 },
        data: expect.objectContaining({ statusVersao: "ENVIADA" }),
      })
    );
    expect(db.redacao.findUnique).toHaveBeenCalledTimes(2);
  });

  it("CT009 bloqueia rota privada sem token JWT", async () => {
    const response = await request("GET", "/redacoes");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ codigo: "TOKEN_INVALIDO" });
    expect(db.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("CT010 impede que outro aluno exclua a redação", async () => {
    db.usuario.findUnique.mockResolvedValue({ status: "ATIVO" });
    db.redacao.findUnique.mockResolvedValue({
      id: 3,
      idAluno: 9,
      versoes: [{ id: 20, numeroVersao: 1, statusVersao: "RASCUNHO" }],
    });

    const response = await request("DELETE", "/redacoes/3", {
      token: gerarTokenSessao(10, "ALUNO"),
    });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ codigo: "SEM_PERMISSAO" });
    expect(db.redacao.delete).not.toHaveBeenCalled();
  });
});
