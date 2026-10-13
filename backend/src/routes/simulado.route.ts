import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  getCaderno,
  getSimulados,
  getSimulado,
  patchResposta,
  postFinalizar,
  postIniciar,
  postRevisarErro,
  postRefazerErros,
  postSimulado,
} from "../controllers/simulado.controller";
import {
  deleteAssunto,
  deleteQuestao,
  getAssuntos,
  getQuestao,
  getQuestoes,
  patchAssunto,
  patchQuestao,
  postAssunto,
  postAtivarQuestao,
  postInativarQuestao,
  postQuestao,
} from "../controllers/questao.controller";

const router = Router();
const aluno = [exigirAutenticacao, exigirPapel("ALUNO")];

const admin = [exigirAutenticacao, exigirPapel("ADMINISTRADOR")];
const todos = [exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO")];

router.get("/questoes", ...todos, getQuestoes);
router.get("/questoes/:idQuestao", ...admin, getQuestao);
router.post("/questoes", ...admin, postQuestao);
router.patch("/questoes/:idQuestao", ...admin, patchQuestao);
router.delete("/questoes/:idQuestao", ...admin, deleteQuestao);
router.post("/questoes/:idQuestao/inativar", ...admin, postInativarQuestao);
router.post("/questoes/:idQuestao/ativar", ...admin, postAtivarQuestao);
router.get("/assuntos", ...todos, getAssuntos);
router.post("/assuntos", ...admin, postAssunto);
router.patch("/assuntos/:idAssunto", ...admin, patchAssunto);
router.delete("/assuntos/:idAssunto", ...admin, deleteAssunto);
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
