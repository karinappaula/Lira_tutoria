/**
 * Utilitários para detecção, extração e parse inteligente de Questões e Texto Base (Estilo ENEM/Vestibulares).
 */

export interface TextoBaseExtraido {
  textoBase: string | null;
  enunciado: string;
}

/**
 * Identifica e extrai a relação textoBase dentro do texto do enunciado.
 * Suporta tags explícitas [TEXTO_BASE]...[/TEXTO_BASE], delimitadores de bloco e
 * cabeçalhos comuns de vestibulares (ENEM, FUVEST, etc), como "Texto para as questões...".
 */
export function extrairTextoBaseEEnunciado(textoCompleto: string): TextoBaseExtraido {
  if (!textoCompleto) return { textoBase: null, enunciado: '' };

  const texto = textoCompleto.trim();

  // 1. Tag explícita [TEXTO_BASE]...[/TEXTO_BASE] ou [TEXTO BASE]...[/TEXTO BASE]
  const matchTag = texto.match(/\[TEXTO[ _-]BASE\]([\s\S]*?)\[\/TEXTO[ _-]BASE\]/i);
  if (matchTag && matchTag[1] !== undefined) {
    const textoBase = matchTag[1].trim();
    const tagCompleta = matchTag[0] ?? '';
    const enunciado = texto.replace(tagCompleta, '').trim();
    return { textoBase: textoBase || null, enunciado };
  }

  // 2. Delimitador de bloco --- TEXTO BASE --- ... --- FIM TEXTO BASE ---
  const matchDelim = texto.match(
    /---+\s*TEXTO[ _-]BASE\s*---+([\s\S]*?)---+\s*FIM[ _-](?:TEXTO[ _-]BASE)?\s*---+/i,
  );
  if (matchDelim && matchDelim[1] !== undefined) {
    const textoBase = matchDelim[1].trim();
    const delimCompleto = matchDelim[0] ?? '';
    const enunciado = texto.replace(delimCompleto, '').trim();
    return { textoBase: textoBase || null, enunciado };
  }

  // 3. Padrão ENEM / Vestibulares com cabeçalho de apoio inicial:
  // "Texto para as questões...", "Texto para a próxima questão...", "Texto base:", "Leia o texto...", etc.
  const regexLinhaCabecalhoApoio =
    /^(?:TEXTO(?: PARA AS QUEST[ÕO]ES[^\n]*| PARA A QUEST[ÃA]O[^\n]*| DE APOIO:?| BASE:?| [1-9]:?| I{1,3}:?)?|LEIA O TEXTO[^\n]*|INSTRU[ÇC][ÃA]O:[^\n]*|TEXTO:?)\s*$/i;

  const linhas = texto.split('\n');
  const indiceCabecalho = linhas.findIndex((l) => regexLinhaCabecalhoApoio.test(l.trim()));

  if (indiceCabecalho >= 0 && indiceCabecalho <= 3) {
    const corpoAposCabecalho = linhas.slice(indiceCabecalho).join('\n').trim();
    const paragrafos = corpoAposCabecalho.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

    if (paragrafos.length >= 2) {
      let indiceCorteEnunciado = paragrafos.length - 1;

      const penultimo = paragrafos[paragrafos.length - 2];
      if (
        penultimo &&
        (penultimo.endsWith(':') ||
          /^(?:Com base|A partir|De acordo|Considerando|Assinale|Em rela[çc][ãa]o|No texto|No poema|Na tirinha|O autor|Quanto [aà])/i.test(
            penultimo,
          )) &&
        paragrafos.length >= 3
      ) {
        indiceCorteEnunciado = paragrafos.length - 2;
      }

      const textoBase = paragrafos.slice(0, indiceCorteEnunciado).join('\n\n').trim();
      const enunciado = paragrafos.slice(indiceCorteEnunciado).join('\n\n').trim();

      if (textoBase.length >= 20 && enunciado.length > 0) {
        return { textoBase, enunciado };
      }
    }
  }

  // 4. Fallback de blocos
  const blocos = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocos.length >= 2) {
    const primeiroBloco = blocos[0];
    if (
      primeiroBloco &&
      /^(?:TEXTO|LEIA O TEXTO|TEXTO DE APOIO|TEXTO BASE|TEXTO 1|TEXTO I)\b/i.test(primeiroBloco)
    ) {
      const textoBase = blocos.slice(0, blocos.length - 1).join('\n\n').trim();
      const enunciado = blocos[blocos.length - 1]?.trim() ?? '';
      return { textoBase, enunciado };
    }
  }

  return { textoBase: null, enunciado: texto };
}

/**
 * Empacota o enunciado e o texto base compartilhado no formato reconhecido pelo LIRA.
 */
export function formatarTextoComTextoBase(enunciado: string, textoBase?: string | null): string {
  const e = (enunciado || '').trim();
  const tb = (textoBase || '').trim();
  if (!tb) return e;

  // Se já tiver tag, não duplica
  if (/\[TEXTO[ _-]BASE\]/i.test(e)) return e;

  return `[TEXTO_BASE]\n${tb}\n[/TEXTO_BASE]\n\n${e}`;
}

export interface QuestaoParseada {
  vestibular?: string;
  ano?: number;
  numeroQuestao?: number;
  textoBase?: string;
  enunciado: string;
  alternativas: Record<string, string>;
  letraCorreta?: string;
  explicacaoGabarito?: string;
}

/**
 * Parser Inteligente de Questão:
 * Extrai Vestibular, Ano, Número, Texto Base, Enunciado, Alternativas (A a E) e Gabarito a partir de texto colado.
 * Suporta formatos flexíveis de alternativas: "A)", "a)", "A.", "a.", "A -", "a -", "(A)", "(a)", "[A]".
 */
export function parsearTextoQuestao(textoBruto: string): QuestaoParseada {
  const resultado: QuestaoParseada = {
    enunciado: '',
    alternativas: { A: '', B: '', C: '', D: '', E: '' },
  };

  if (!textoBruto || !textoBruto.trim()) return resultado;

  let texto = textoBruto.trim();

  // 1. Extrair Resolução Comentada / Explicação no fim do texto
  const matchResolucao = texto.match(
    /(?:^|\n)\s*(?:RESOLU[ÇC][ÃA]O|EXPLICA[ÇC][ÃA]O|COMENT[ÁA]RIO|RESOLU[ÇC][ÃA]O COMENTADA)[:\s]+([\s\S]+)$/i,
  );
  if (matchResolucao && matchResolucao[1] && matchResolucao.index !== undefined) {
    resultado.explicacaoGabarito = matchResolucao[1].trim();
    texto = texto.slice(0, matchResolucao.index).trim();
  }

  // 2. Extrair Gabarito Oficial (ex: "Gabarito: B", "Resposta: C")
  // Deve estar no início de uma linha ou antecedido por quebra de linha
  const matchGabarito = texto.match(
    /(?:^|\n)\s*(?:GABARITO|RESPOSTA(?: CORRETA)?|ALTERNATIVA CORRETA|OP[ÇC][ÃA]O CORRETA)[:\s]+([A-Ea-e])\b/i,
  );
  if (matchGabarito && matchGabarito[1] && matchGabarito.index !== undefined) {
    resultado.letraCorreta = matchGabarito[1].toUpperCase();
    texto = (
      texto.slice(0, matchGabarito.index) +
      '\n' +
      texto.slice(matchGabarito.index + matchGabarito[0].length)
    ).trim();
  }

  // Se a resolução estava antes do gabarito, confere novamente
  if (!resultado.explicacaoGabarito) {
    const matchResolucaoFinal = texto.match(
      /(?:^|\n)\s*(?:RESOLU[ÇC][ÃA]O|EXPLICA[ÇC][ÃA]O|COMENT[ÁA]RIO|RESOLU[ÇC][ÃA]O COMENTADA)[:\s]+([\s\S]+)$/i,
    );
    if (matchResolucaoFinal && matchResolucaoFinal[1] && matchResolucaoFinal.index !== undefined) {
      resultado.explicacaoGabarito = matchResolucaoFinal[1].trim();
      texto = texto.slice(0, matchResolucaoFinal.index).trim();
    }
  }

  // 3. Extrair Cabeçalho (Vestibular, Ano, Número da questão)
  // Ex: "(ENEM 2023 - Questão 14)", "(FUVEST 2022)", "UNICAMP 2020", "(ENEM PPL 2021)"
  const matchCabecalho = texto.match(
    /^\s*(?:\(\s*([A-Za-z0-9_-]{3,12})\b[^\d\n]*(\d{4})?(?:[^\d\n]*(?:quest[ãa]o|n[ºo]?\.?)\s*(\d+))?[^\)\n]*\)|\b(ENEM|FUVEST|UNICAMP|UNESP|UERJ|ITA|IME|MACKENZIE|PUC)\b\s*[-/,\s]*(\d{4})?(?:[^\d\n]*(?:quest[ãa]o|n[ºo]?\.?)\s*(\d+))?)/i,
  );

  if (matchCabecalho) {
    const vest = (matchCabecalho[1] || matchCabecalho[4] || '').toUpperCase();
    const anoStr = matchCabecalho[2] || matchCabecalho[5];
    const numStr = matchCabecalho[3] || matchCabecalho[6];

    if (vest) resultado.vestibular = vest;
    if (anoStr) resultado.ano = parseInt(anoStr, 10);
    if (numStr) resultado.numeroQuestao = parseInt(numStr, 10);

    const cabecalhoTexto = matchCabecalho[0] ?? '';
    texto = texto.slice(cabecalhoTexto.length).trim();
  }

  // 4. Localizar Alternativas (A, B, C, D, E)
  // Padrões flexíveis suportados:
  // - Letra isolada seguida de espaço no início da linha: "A Texto...", "B Texto...", "a Texto..."
  // - Letra com pontuação: "A)", "a)", "A.", "a.", "A -", "a -", "A –", "(A)", "(a)", "[A]", "A:"
  const regexAlt =
    /(?:^|\n)\s*(?:\(?([A-Ea-e])\)|\b([A-Ea-e])\s*[\.\-\–\—\:\)]|\[([A-Ea-e])\]|\b([A-Ea-e]))\s+([\s\S]*?)(?=(?:\n\s*(?:\(?[A-Ea-e]\)|\b[A-Ea-e]\s*[\.\-\–\—\:\)]|\[[A-Ea-e]\]|\b[A-Ea-e])\s+)|$)/g;

  const matches = [...texto.matchAll(regexAlt)].map((m) => {
    const letra = (m[1] || m[2] || m[3] || m[4] || '').toUpperCase();
    const conteudoAlt = (m[5] || '').trim();
    return {
      letra,
      conteudoAlt,
      index: m.index ?? -1,
    };
  });

  let indicePrimeiraAlternativa = -1;

  if (matches.length > 0) {
    // Localiza o início real do bloco de alternativas buscando a primeira ocorrência de B
    // (pois "B" isolado no início de linha nunca é palavra/artigo da língua portuguesa)
    const indiceB = matches.findIndex((m) => m.letra === 'B');

    let indiceInicioBloco = 0;
    if (indiceB > 0) {
      // Localiza o "A" mais recente que antecede o "B"
      let ultimoA = -1;
      for (let i = indiceB - 1; i >= 0; i--) {
        if (matches[i]?.letra === 'A') {
          ultimoA = i;
          break;
        }
      }
      indiceInicioBloco = ultimoA !== -1 ? ultimoA : indiceB;
    } else if (indiceB === -1) {
      const indiceA = matches.findIndex((m) => m.letra === 'A');
      indiceInicioBloco = indiceA !== -1 ? indiceA : 0;
    }

    const matchesValidos = matches.slice(indiceInicioBloco);
    matchesValidos.forEach((m) => {
      if (['A', 'B', 'C', 'D', 'E'].includes(m.letra)) {
        resultado.alternativas[m.letra] = m.conteudoAlt;
      }
    });

    indicePrimeiraAlternativa = matches[indiceInicioBloco]?.index ?? -1;
  }

  // 5. O que vem antes das alternativas é o corpo do enunciado / texto base
  const corpoAntesDasAlternativas =
    indicePrimeiraAlternativa >= 0 ? texto.slice(0, indicePrimeiraAlternativa).trim() : texto.trim();

  // 6. Separação de Texto Base vs Enunciado
  const extraido = extrairTextoBaseEEnunciado(corpoAntesDasAlternativas);
  if (extraido.textoBase) {
    resultado.textoBase = extraido.textoBase;
    resultado.enunciado = extraido.enunciado;
  } else {
    resultado.enunciado = corpoAntesDasAlternativas;
  }

  return resultado;
}
