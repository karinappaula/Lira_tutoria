import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  getAssuntos,
  getCaderno,
  getQuestoes,
  getSimulados,
  patchResposta,
  postFinalizar,
  postIniciar,
  postRevisarErro,
  postSimulado,
} from "../controllers/simulado.controller";

const router = Router();
const aluno = [exigirAutenticacao, exigirPapel("ALUNO")];

router.get("/questoes", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getQuestoes);
router.get("/assuntos", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getAssuntos);
router.post("/simulados", ...aluno, postSimulado);
router.get("/simulados", ...aluno, getSimulados);
router.post("/simulados/:idSimulado/iniciar", ...aluno, postIniciar);
router.patch("/simulados/:idSimulado/respostas", ...aluno, patchResposta);
router.post("/simulados/:idSimulado/finalizar", ...aluno, postFinalizar);
router.get("/caderno-erros", ...aluno, getCaderno);
router.post("/caderno-erros/:idCaderno/revisar", ...aluno, postRevisarErro);

export default router;
