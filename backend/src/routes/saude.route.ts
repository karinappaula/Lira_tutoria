import { Router } from "express";
import { prisma } from "../db/prisma";

const router = Router();

// GET /saude — confirma que a API está de pé E que a conexão
// com o MySQL via Prisma está funcionando 
router.get("/saude", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok", banco: "conectado" });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ status: "erro", banco: "sem conexao" });
  }
});

export default router;
