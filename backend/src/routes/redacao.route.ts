import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  getRedacao,
  getRedacoes,
  patchRascunho,
  postEnviarRedacao,
  postRedacao,
  postReescrita,
} from "../controllers/redacao.controller";

const router = Router();

router.get("/redacoes", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getRedacoes);
router.get("/redacoes/:idRedacao", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getRedacao);
router.post("/redacoes", exigirAutenticacao, exigirPapel("ALUNO"), postRedacao);
router.patch("/redacoes/:idRedacao/rascunho", exigirAutenticacao, exigirPapel("ALUNO"), patchRascunho);
router.post("/redacoes/:idRedacao/enviar", exigirAutenticacao, exigirPapel("ALUNO"), postEnviarRedacao);
router.post("/redacoes/:idRedacao/reescrita", exigirAutenticacao, exigirPapel("ALUNO"), postReescrita);

export default router;
