import { Router } from "express";
import { prisma } from "../db/prisma";

const router = Router();

// GET /health — confirma que a API está de pé E que a conexão
// com o MySQL via Prisma está funcionando (exigência da Sprint 2:
// "conexão e integração com o banco de dados testada no código").
router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok", banco: "conectado" });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ status: "erro", banco: "sem conexao" });
  }
});

export default router;
