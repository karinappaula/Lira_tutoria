import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  getCorrecao,
  getCorrecoesPendentes,
  postAprovarCorrecao,
  postCorrecao,
  postSolicitarAjuste,
} from "../controllers/correcao.controller";

const router = Router();

router.get(
  "/correcoes/pendentes",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR", "TUTOR"),
  getCorrecoesPendentes
);
router.get(
  "/correcoes/:idCorrecao",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"),
  getCorrecao
);
router.post(
  "/redacoes/correcoes",
  exigirAutenticacao,
  exigirPapel("TUTOR"),
  postCorrecao
);
router.post(
  "/correcoes/:idCorrecao/aprovar",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR"),
  postAprovarCorrecao
);
router.post(
  "/correcoes/:idCorrecao/solicitar-ajuste",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR"),
  postSolicitarAjuste
);

export default router;
