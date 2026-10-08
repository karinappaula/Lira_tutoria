import { Router } from "express";
import { cadastro, login, selecionarPapelHandler } from "../controllers/auth.controller";

const router = Router();

router.post("/login", login);
router.post("/cadastro", cadastro);
router.post("/selecionar-papel", selecionarPapelHandler);

export default router;
