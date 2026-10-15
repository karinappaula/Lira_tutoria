import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import { postLinkRedefinicao } from "../controllers/recuperacao-senha.controller";
import {
  getUsuario,
  getUsuarios,
  patchStatusUsuario,
  patchTurmaDoTutor,
  patchTutorDoAluno,
} from "../controllers/vinculo.controller";

const router = Router();
const admin = [exigirAutenticacao, exigirPapel("ADMINISTRADOR")];

router.get("/usuarios", ...admin, getUsuarios);
router.get("/usuarios/:idUsuario", ...admin, getUsuario);
router.patch("/usuarios/:idUsuario/status", ...admin, patchStatusUsuario);
router.post("/usuarios/:idUsuario/link-redefinicao", ...admin, postLinkRedefinicao);
router.patch("/alunos/:idAluno/tutor", ...admin, patchTutorDoAluno);
router.patch("/tutores/:idTutor/turma", ...admin, patchTurmaDoTutor);

export default router;
