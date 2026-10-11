import { Router } from "express";
import { cadastro, login, me, selecionarPapelHandler } from "../controllers/auth.controller";
import { exigirAutenticacao } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/cadastro", cadastro);
router.post("/selecionar-papel", selecionarPapelHandler);
router.get("/me", exigirAutenticacao, me);

export default router;
