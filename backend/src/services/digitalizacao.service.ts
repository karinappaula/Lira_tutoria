import { ErroIA, ErroValidacao } from "../errors/erros";
import { gerarConteudoGemini } from "../utils/gemini";

export const TIPOS_IMAGEM_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
export const TAMANHO_MAXIMO_IMAGEM = 10 * 1024 * 1024;

export async function digitalizarRedacao(imagem: Buffer, mimeType: string) {
  if (!Buffer.isBuffer(imagem) || imagem.length === 0) {
    throw new ErroValidacao([{ campo: "imagem", mensagem: "Envie uma imagem para digitalização." }]);
  }
  if (imagem.length > TAMANHO_MAXIMO_IMAGEM) {
    throw new ErroIA("A imagem excede o limite de 10 MB.", 413, "IMAGEM_MUITO_GRANDE");
  }
  if (!TIPOS_IMAGEM_PERMITIDOS.includes(mimeType)) {
    throw new ErroValidacao([
      { campo: "imagem", mensagem: "Envie uma imagem JPG, PNG ou WEBP." },
    ]);
  }

  const texto = await gerarConteudoGemini([
    {
      text: "Transcreva fielmente todo o texto manuscrito presente nesta imagem de redação em Português. Mantenha parágrafos, acentos e pontuação. Ignore números de linha e margens. Use quebras de linha reais entre parágrafos; não represente quebras como \\n ou caracteres escapados. Não escape aspas com barra invertida. Retorne APENAS o texto transcrito.",
    },
    {
      inline_data: {
        mime_type: mimeType,
        data: imagem.toString("base64"),
      },
    },
  ]);

  if (!texto) {
    throw new ErroIA("A IA não conseguiu transcrever a imagem.", 502, "TRANSCRICAO_VAZIA");
  }

  const textoNormalizado = texto
    .replace(/\\r\\n/g, "\r\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\"/g, '"')
    .trim();

  return { texto: textoNormalizado };
}
