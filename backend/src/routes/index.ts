import { Router } from "express";
import healthRoute from "./health.route";
import turmaRoute from "./turma.route";
import authRoute from "./auth.route";
import conviteRoute from "./convite.route";
import participacaoRoute from "./participacao.route";

const router = Router();

router.use(healthRoute);
router.use(turmaRoute);
router.use("/auth", authRoute);
router.use(conviteRoute);
router.use(participacaoRoute);

export default router;
