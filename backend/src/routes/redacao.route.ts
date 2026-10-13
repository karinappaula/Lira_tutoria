import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  deleteRedacao,
  getRedacao,
  getRedacoes,
  getAguardandoCorrecao,
  patchRascunho,
  postEnviarRedacao,
  postRedacao,
  postReescrita,
  postSolicitarReescrita,
} from "../controllers/redacao.controller";

const router = Router();

router.get("/redacoes", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getRedacoes);
router.get("/redacoes/aguardando-correcao", exigirAutenticacao, exigirPapel("TUTOR"), getAguardandoCorrecao);
router.get("/redacoes/:idRedacao", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getRedacao);
router.post("/redacoes", exigirAutenticacao, exigirPapel("ALUNO"), postRedacao);
router.patch("/redacoes/:idRedacao/rascunho", exigirAutenticacao, exigirPapel("ALUNO"), patchRascunho);
router.post("/redacoes/:idRedacao/enviar", exigirAutenticacao, exigirPapel("ALUNO"), postEnviarRedacao);
router.post("/redacoes/:idRedacao/reescrita", exigirAutenticacao, exigirPapel("ALUNO"), postReescrita);
router.post("/redacoes/:idRedacao/solicitar-reescrita", exigirAutenticacao, exigirPapel("TUTOR"), postSolicitarReescrita);
router.delete("/redacoes/:idRedacao", exigirAutenticacao, exigirPapel("ALUNO"), deleteRedacao);

export default router;
