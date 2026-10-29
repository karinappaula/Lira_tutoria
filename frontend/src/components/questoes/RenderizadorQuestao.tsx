'use client';

import { Fragment, useMemo, type ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { cx } from '@/lib/cx';
import { extrairTextoBaseEEnunciado } from './textoBaseHelper';
import styles from './RenderizadorQuestao.module.scss';

interface Props {
  conteudo: string;
  imagemUrl?: string | null;
  className?: string;
  /** Se deve identificar e destacar o Texto Base acima do enunciado (padrão: true) */
  identificarTextoBase?: boolean;
}

/**
 * Converte trecho de texto com Markdown (**negrito**, *itálico*, `código`) em nós React.
 */
function parsearMarkdownLinha(linha: string): ReactNode {
  // Regex para capturar **negrito**, *itálico* ou `código`
  const partes = linha.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g);

  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length >= 4) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    if (parte.startsWith('*') && parte.endsWith('*') && parte.length >= 2) {
      return <em key={i}>{parte.slice(1, -1)}</em>;
    }
    if (parte.startsWith('`') && parte.endsWith('`') && parte.length >= 2) {
      return <code key={i}>{parte.slice(1, -1)}</code>;
    }
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

/**
 * Renderiza bloco de texto interpretando quebras de linha e substituindo [IMAGEM] in-line.
 */
function renderizarTextoComImagemInline(texto: string, imagemUrl?: string | null): ReactNode {
  if (!texto) return null;

  // Divide pelo marcador [IMAGEM] (case insensitive)
  const partesImagem = texto.split(/(\[IMAGEM\])/i);
  let substituiuMarcador = false;

  const conteudoRenderizado = partesImagem.map((parte, idx) => {
    if (/^\[IMAGEM\]$/i.test(parte.trim())) {
      substituiuMarcador = true;
      if (imagemUrl) {
        return (
          <div key={`img-inline-${idx}`} className={styles.blocoImagemInline}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagemUrl} alt="Imagem da questão" className={styles.imagemInline} />
          </div>
        );
      }
      return null;
    }

    // Processa parágrafos e quebras de linha
    const paragrafos = parte.split(/\n{2,}/).filter((p) => p.trim().length > 0);
    if (paragrafos.length === 0) return null;

    return (
      <Fragment key={`txt-${idx}`}>
        {paragrafos.map((p, pIdx) => {
          const linhas = p.split('\n');
          return (
            <p key={`p-${pIdx}`}>
              {linhas.map((linha, lIdx) => (
                <Fragment key={`l-${lIdx}`}>
                  {parsearMarkdownLinha(linha)}
                  {lIdx < linhas.length - 1 && <br />}
                </Fragment>
              ))}
            </p>
          );
        })}
      </Fragment>
    );
  });

  return (
    <>
      {conteudoRenderizado}
      {/* Se há imagem mas não havia a tag [IMAGEM] explícita no texto, renderiza ao final como fallback */}
      {imagemUrl && !substituiuMarcador && (
        <div className={styles.blocoImagemFallback}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagemUrl} alt="Imagem de apoio da questão" className={styles.imagemInline} />
        </div>
      )}
    </>
  );
}

export function RenderizadorQuestao({
  conteudo,
  imagemUrl,
  className,
  identificarTextoBase = true,
}: Props) {
  const { textoBase, enunciado } = useMemo(() => {
    if (!identificarTextoBase) {
      return { textoBase: null, enunciado: conteudo };
    }
    return extrairTextoBaseEEnunciado(conteudo);
  }, [conteudo, identificarTextoBase]);

  // Determina onde a imagem deve ser injetada (se há marcador [IMAGEM] no texto base ou no enunciado)
  const temMarcadorNoTextoBase = Boolean(textoBase && /\[IMAGEM\]/i.test(textoBase));
  const temMarcadorNoEnunciado = Boolean(/\[IMAGEM\]/i.test(enunciado));

  let urlParaTextoBase: string | null | undefined = undefined;
  let urlParaEnunciado: string | null | undefined = undefined;

  if (temMarcadorNoTextoBase && temMarcadorNoEnunciado) {
    urlParaTextoBase = imagemUrl;
    urlParaEnunciado = imagemUrl;
  } else if (temMarcadorNoTextoBase) {
    urlParaTextoBase = imagemUrl;
    urlParaEnunciado = undefined;
  } else {
    // Marcador no enunciado ou fallback padrão no enunciado
    urlParaTextoBase = undefined;
    urlParaEnunciado = imagemUrl;
  }

  return (
    <div className={cx(styles.containerRenderizador, className)}>
      {/* 1. Card de Leitura Destacado para Texto Base Compartilhado (Estilo ENEM) */}
      {textoBase && (
        <div className={styles.cardTextoBase}>
          <div className={styles.cabecalhoTextoBase}>
            <BookOpen size={16} aria-hidden="true" />
            <span>Texto Base de Leitura (Comum às questões associadas)</span>
          </div>
          <div className={styles.corpoTextoBase}>
            {renderizarTextoComImagemInline(textoBase, urlParaTextoBase)}
          </div>
        </div>
      )}

      {/* 2. Enunciado Principal com Markdown e [IMAGEM] In-line */}
      <div className={styles.corpoEnunciado}>
        {renderizarTextoComImagemInline(enunciado, urlParaEnunciado)}
      </div>
    </div>
  );
}
