import { Router } from "express";
import healthRoute from "./health.route";
import turmaRoute from "./turma.route";
import authRoute from "./auth.route";
import conviteRoute from "./convite.route";
import participacaoRoute from "./participacao.route";
import temaRoute from "./tema.route";
import tarefaRoute from "./tarefa.route";
import redacaoRoute from "./redacao.route";
import correcaoRoute from "./correcao.route";
import simuladoRoute from "./simulado.route";

const router = Router();

router.use(healthRoute);
router.use(turmaRoute);
router.use("/auth", authRoute);
router.use(conviteRoute);
router.use(participacaoRoute);
router.use(temaRoute);
router.use(tarefaRoute);
router.use(redacaoRoute);
router.use(correcaoRoute);
router.use(simuladoRoute);

export default router;
