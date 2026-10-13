import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  getAssuntos,
  getCaderno,
  getQuestao,
  getQuestoes,
  getSimulados,
  getSimulado,
  patchResposta,
  postFinalizar,
  postIniciar,
  postRevisarErro,
  postRefazerErros,
  postQuestao,
  patchQuestao,
  deleteQuestao,
  postSimulado,
} from "../controllers/simulado.controller";

const router = Router();
const aluno = [exigirAutenticacao, exigirPapel("ALUNO")];

router.get("/questoes", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getQuestoes);
router.get("/assuntos", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getAssuntos);
router.get("/questoes/:idQuestao", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), getQuestao);
router.post("/questoes", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), postQuestao);
router.patch("/questoes/:idQuestao", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), patchQuestao);
router.delete("/questoes/:idQuestao", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), deleteQuestao);
router.post("/simulados", ...aluno, postSimulado);
router.get("/simulados", ...aluno, getSimulados);
router.get("/simulados/:idSimulado", ...aluno, getSimulado);
router.post("/simulados/:idSimulado/iniciar", ...aluno, postIniciar);
router.patch("/simulados/:idSimulado/respostas", ...aluno, patchResposta);
router.post("/simulados/:idSimulado/finalizar", ...aluno, postFinalizar);
router.get("/caderno-erros", ...aluno, getCaderno);
router.post("/caderno-erros/refazer", ...aluno, postRefazerErros);
router.post("/caderno-erros/:idCaderno/revisar", ...aluno, postRevisarErro);

export default router;
