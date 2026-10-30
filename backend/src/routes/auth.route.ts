import { Router } from "express";
import {
  cadastro,
  login,
  me,
  obterDetalhesConvite,
  selecionarPapelHandler,
  verificarEmail,
} from "../controllers/auth.controller";
import {
  esqueciSenha,
  redefinirSenhaHandler,
} from "../controllers/recuperacao-senha.controller";
import { exigirAutenticacao } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/cadastro", cadastro);
router.get("/convite/:codigo", obterDetalhesConvite);
router.post("/verificar-email", verificarEmail);
router.post("/selecionar-papel", selecionarPapelHandler);
router.post("/esqueci-senha", esqueciSenha);
router.post("/redefinir-senha", redefinirSenhaHandler);
router.get("/me", exigirAutenticacao, me);

export default router;
