import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  criarConviteAluno,
  criarConviteTutor,
  listarConvites,
} from "../controllers/convite.controller";

const router = Router();

router.post(
  "/turmas/:idTurma/convites/tutor",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR"),
  criarConviteTutor
);
router.get(
  "/convites",
  exigirAutenticacao,
  exigirPapel("ADMINISTRADOR"),
  listarConvites
);
router.post(
  "/tutor/convites/aluno",
  exigirAutenticacao,
  exigirPapel("TUTOR"),
  criarConviteAluno
);

export default router;
