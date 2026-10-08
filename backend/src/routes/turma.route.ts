import { Router } from "express";
import { getTurmas, postTurma } from "../controllers/turma.controller";

const router = Router();

// NOTA: ainda sem middleware de autenticação/autorização — isso entra
// assim que o módulo de auth (próximo passo) estiver pronto. Por ora,
// estas rotas servem para validar a integração Express -> Prisma -> MySQL
// exigida nesta sprint.
router.get("/turmas", getTurmas);
router.post("/turmas", postTurma);

export default router;
