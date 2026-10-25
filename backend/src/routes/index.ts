import { Router } from "express";
import saudeRoute from "./saude.route";
import turmaRoute from "./turma.route";
import authRoute from "./auth.route";
import conviteRoute from "./convite.route";
import participacaoRoute from "./participacao.route";
import temaRoute from "./tema.route";
import tarefaRoute from "./tarefa.route";
import redacaoRoute from "./redacao.route";
import correcaoRoute from "./correcao.route";
import simuladoRoute from "./simulado.route";
import comunicadoRoute from "./comunicado.route";
import indicadoresRoute from "./indicadores.route";
import vinculoRoute from "./vinculo.route";


const router = Router();

router.use(saudeRoute);
router.use(turmaRoute);
router.use("/auth", authRoute);
router.use(vinculoRoute);
router.use(conviteRoute);
router.use(participacaoRoute);
router.use(temaRoute);
router.use(tarefaRoute);
router.use(redacaoRoute);
router.use(correcaoRoute);
router.use(simuladoRoute);
router.use(comunicadoRoute);
router.use(indicadoresRoute);

export default router;
