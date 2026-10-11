import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import { deleteTarefa, getTarefa, getTarefas, patchTarefa, postReplicarTarefa, postTarefa } from "../controllers/tarefa.controller";

const router = Router();
router.get("/tarefas", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getTarefas);
router.get("/tarefas/:idTarefa", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getTarefa);
router.post("/tarefas", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR"), postTarefa);
router.patch("/tarefas/:idTarefa", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), patchTarefa);
router.delete("/tarefas/:idTarefa", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), deleteTarefa);
router.post("/tarefas/:idTarefa/replicar", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), postReplicarTarefa);
export default router;
