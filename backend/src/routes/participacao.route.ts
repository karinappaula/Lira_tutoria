import { Router } from "express";
import { participarAluno } from "../controllers/participacao.controller";
import { exigirAutenticacao } from "../middlewares/auth.middleware";

const router = Router();

router.post("/auth/participar-como-aluno", exigirAutenticacao, participarAluno);

export default router;
