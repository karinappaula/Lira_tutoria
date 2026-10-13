import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  deleteAnexo,
  deleteTarefa,
  getTarefa,
  getTarefas,
  patchTarefa,
  postAnexo,
  postAplicarAtividadeGeral,
  postTarefa,
} from "../controllers/tarefa.controller";

const router = Router();
router.get("/tarefas", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getTarefas);
router.get("/tarefas/:idTarefa", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getTarefa);
router.post("/tarefas", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR"), postTarefa);
router.patch("/tarefas/:idTarefa", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR"), patchTarefa);
router.delete("/tarefas/:idTarefa", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR"), deleteTarefa);
// RN07: quem aplica a atividade geral ao grupo é o Tutor.
router.post("/tarefas/:idTarefa/replicar", exigirAutenticacao, exigirPapel("TUTOR"), postAplicarAtividadeGeral);
router.post("/tarefas/:idTarefa/anexos", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR"), postAnexo);
router.delete("/tarefas/:idTarefa/anexos/:idAnexo", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR"), deleteAnexo);
export default router;
