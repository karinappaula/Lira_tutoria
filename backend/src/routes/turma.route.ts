import { Router } from "express";
import {
  getTurma,
  getTurmas,
  patchTurma,
  postArquivarTurma,
  postDesarquivarTurma,
  postTurma,
} from "../controllers/turma.controller";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/turmas",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"),
  getTurmas
);
router.get(
  "/turmas/:idTurma",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"),
  getTurma
);
router.post(
  "/turmas",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR"),
  postTurma
);
router.patch(
  "/turmas/:idTurma",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR"),
  patchTurma
);
router.post(
  "/turmas/:idTurma/arquivar",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR"),
  postArquivarTurma
);
router.post(
  "/turmas/:idTurma/desarquivar",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR"),
  postDesarquivarTurma
);

export default router;
