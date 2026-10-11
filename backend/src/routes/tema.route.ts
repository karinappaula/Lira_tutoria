import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import { deleteTema, getTema, getTemas, patchTema, postTema } from "../controllers/tema.controller";

const router = Router();
router.get("/temas", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getTemas);
router.get("/temas/:idTema", exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR", "ALUNO"), getTema);
router.post("/temas", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), postTema);
router.patch("/temas/:idTema", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), patchTema);
router.delete("/temas/:idTema", exigirAutenticacao, exigirPapel("ADMINISTRADOR"), deleteTema);
export default router;
