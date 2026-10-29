import { Router } from "express";
import multer from "multer";
import { postAvaliarRedacao } from "../controllers/avaliacao.controller";
import { postDigitalizarRedacao } from "../controllers/digitalizacao.controller";
import { ErroValidacao } from "../errors/erros";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  TAMANHO_MAXIMO_IMAGEM,
  TIPOS_IMAGEM_PERMITIDOS,
} from "../services/digitalizacao.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_IMAGEM, files: 1, fields: 0 },
  fileFilter: (_req, arquivo, callback) => {
    if (!TIPOS_IMAGEM_PERMITIDOS.includes(arquivo.mimetype)) {
      callback(new ErroValidacao([
        { campo: "imagem", mensagem: "Envie uma imagem JPG, PNG ou WEBP." },
      ]));
      return;
    }
    callback(null, true);
  },
});

const autenticacaoAluno = [
  exigirAutenticacao,
  exigirPapel("ALUNO"),
];

const autenticacaoTutor = [
  exigirAutenticacao,
  exigirPapel("TUTOR"),
];

const router = Router();

router.post("/ia/digitalizar", ...autenticacaoAluno, upload.single("imagem"), postDigitalizarRedacao);
router.post("/ia/avaliar", ...autenticacaoTutor, postAvaliarRedacao);

export default router;
