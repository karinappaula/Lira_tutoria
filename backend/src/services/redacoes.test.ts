/// <reference types="jest" />
import { prisma } from "../db/prisma";
import { criarCorrecao } from "./correcao.service";
import { salvarRascunho } from "./redacao.service";

jest.mock("../db/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    aluno: { findUnique: jest.fn() },
    tema: { findUnique: jest.fn() },
    redacao: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    versaoRedacao: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    correcao: { create: jest.fn() },
    auditoria: { create: jest.fn() },
  },
}));
jest.mock("./auditoria.service", () => ({ registrarAuditoria: jest.fn() }));

const db = prisma as unknown as {
  $transaction: jest.Mock;
  redacao: Record<string, jest.Mock>;
  versaoRedacao: Record<string, jest.Mock>;
  correcao: Record<string, jest.Mock>;
};

const comentarios = {
  comentarioComp1: "Atende à norma padrão.",
  comentarioComp2: "Compreende a proposta.",
  comentarioComp3: "Argumentos claros.",
  comentarioComp4: "Boa coesão.",
  comentarioComp5: "Intervenção completa.",
};

describe("Testes unitários oficiais de redação", () => {
  beforeEach(() => jest.clearAllMocks());

  it("CT006 calcula a nota final como soma das cinco competências ENEM", async () => {
    db.versaoRedacao.findUnique.mockResolvedValue({
      id: 20,
      idRedacao: 3,
      numeroVersao: 1,
      statusVersao: "ENVIADA",
      conteudoTexto: "Redação enviada para correção.",
      redacao: {
        tipoFluxo: "TREINO",
        aluno: { tutor: { idUsuario: 7 } },
        tarefa: null,
      },
      correcoes: [],
    });

    const tx = {
      correcao: {
        create: jest.fn().mockImplementation(({ data }) => data),
      },
      versaoRedacao: { update: jest.fn() },
      auditoria: { create: jest.fn() },
    };
    db.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) =>
      callback(tx)
    );

    const resultado = await criarCorrecao(7, {
      idVersao: 20,
      notaComp1: 200,
      notaComp2: 160,
      notaComp3: 120,
      notaComp4: 80,
      notaComp5: 40,
      ...comentarios,
    });

    expect(resultado.notaTotal).toBe(600);
    expect(tx.correcao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notaTotal: 600 }),
      })
    );
  });

  it("CT007 aceita até 100.000 caracteres e rejeita o caractere excedente", async () => {
    db.redacao.findUnique.mockResolvedValue({
      id: 3,
      idAluno: 9,
      versoes: [{ id: 20, numeroVersao: 1, statusVersao: "RASCUNHO" }],
    });

    db.versaoRedacao.update.mockResolvedValue({ id: 20 });
    await expect(salvarRascunho(9, 3, "a".repeat(100_000))).resolves.toMatchObject({ id: 20 });
    expect(db.versaoRedacao.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { conteudoTexto: "a".repeat(100_000) },
    });

    await expect(salvarRascunho(9, 3, "a".repeat(100_001))).rejects.toMatchObject({
      codigo: "CONTEUDO_MUITO_LONGO",
    });
    expect(db.versaoRedacao.update).toHaveBeenCalledTimes(1);
  });
});
