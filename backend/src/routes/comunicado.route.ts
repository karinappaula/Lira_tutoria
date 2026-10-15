import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  getComunicado,
  getContagemNaoLidos,
  getEnviados,
  getRecebidos,
  postComunicado,
  postLido,
} from "../controllers/comunicado.controller";

const router = Router();
const remetentes = [exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR")];
const destinatarios = [exigirAutenticacao, exigirPapel("TUTOR", "ALUNO")];
const todos = [exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO")];

// Rotas fixas antes de "/comunicados/:idComunicado".
router.post("/comunicados", ...remetentes, postComunicado);
router.get("/comunicados", ...destinatarios, getRecebidos);
router.get("/comunicados/nao-lidos", ...destinatarios, getContagemNaoLidos);
router.get("/comunicados/enviados", ...remetentes, getEnviados);
router.get("/comunicados/:idComunicado", ...todos, getComunicado);
router.post("/comunicados/:idComunicado/lido", ...destinatarios, postLido);

export default router;
