import { ErroIA } from "../errors/erros";

const MODELO_GEMINI = "gemini-3.5-flash-lite";

interface GeminiResposta {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

interface GeminiParteTexto {
  text: string;
}

interface GeminiParteImagem {
  inline_data: { mime_type: string; data: string };
}

export async function gerarConteudoGemini(
  partes: Array<GeminiParteTexto | GeminiParteImagem>,
  generationConfig?: { responseMimeType?: string }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ErroIA(
      "A integração com o Gemini não está configurada no servidor.",
      503,
      "IA_NAO_CONFIGURADA"
    );
  }

  let ultimoErro = "A API Gemini não retornou conteúdo.";
  let houveTimeout = false;

  try {
    const resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${MODELO_GEMINI}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: partes }],
          ...(generationConfig ? { generationConfig } : {}),
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );

    const corpo = await resposta.text();
    let dados: GeminiResposta | undefined;
    try {
      dados = JSON.parse(corpo) as GeminiResposta;
    } catch {
      dados = undefined;
    }

    if (!resposta.ok) {
      ultimoErro = dados?.error?.message ?? `Gemini respondeu com HTTP ${resposta.status}.`;
    } else {
      const texto = dados?.candidates?.[0]?.content?.parts
        ?.map((parte) => parte.text ?? "")
        .join("")
        .trim();
      if (texto) return texto;

      ultimoErro = "A API Gemini não retornou conteúdo utilizável.";
    }
  } catch (erro) {
    if (erro instanceof Error) {
      houveTimeout ||=
        erro.name === "TimeoutError" ||
        erro.name === "AbortError" ||
        erro.message.toLowerCase().includes("timeout");
      ultimoErro = erro.message;
    } else {
      ultimoErro = "Falha de comunicação com a API Gemini.";
    }
  }

  console.error("Falha ao gerar conteúdo com a API Gemini:", ultimoErro);
  throw new ErroIA(
    houveTimeout
      ? "A solicitação à IA excedeu o tempo limite. Tente novamente."
      : "Não foi possível obter uma resposta da API Gemini.",
    houveTimeout ? 504 : 502,
    houveTimeout ? "TEMPO_LIMITE_IA" : "FALHA_PROVEDOR_IA"
  );
}
