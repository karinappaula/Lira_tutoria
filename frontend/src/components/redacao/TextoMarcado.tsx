'use client';

import { useEffect, useMemo, useRef } from 'react';
import { cx } from '@/lib/cx';
import { construirSegmentos, sobrepoe, type MarcaVisual } from '@/lib/correcoes';
import { infoDoTipo } from '@/lib/rubrica';
import styles from './TextoMarcado.module.scss';

export interface SelecaoDeTrecho {
  inicio: number;
  fim: number;
}

interface Props {
  texto: string;
  marcas: MarcaVisual[];
  /** Marcação escolhida (destacada com mais força) */
  marcaAtiva?: string | number | null;
  aoClicarMarca?: (marca: MarcaVisual) => void;
  /** Se informado, o texto passa a aceitar seleção com mouse ou toque (tela de correção do Tutor) */
  aoSelecionar?: (selecao: SelecaoDeTrecho) => void;
  /** Trecho já selecionado, ainda sem tipo de erro */
  selecaoPendente?: SelecaoDeTrecho | null;
  rotulo: string;
}

const CHAVE_PENDENTE = '__pendente__';

/** Converte (nó, posição) da seleção do navegador em posição dentro do texto original. */
function posicaoNoTexto(no: Node, deslocamento: number, raiz: HTMLElement, tamanho: number): number | null {
  if (no.nodeType === Node.TEXT_NODE) {
    const pai = no.parentElement?.closest<HTMLElement>('[data-inicio]');
    return pai ? Number(pai.dataset.inicio) + deslocamento : null;
  }
  if (no instanceof HTMLElement) {
    const filho = no.childNodes[deslocamento];
    if (filho instanceof HTMLElement && filho.dataset.inicio !== undefined) return Number(filho.dataset.inicio);
    if (!filho && no === raiz) return tamanho;
  }
  return null;
}

/**
 * Mostra o texto da redação com trechos marcados (cor + tipo de sublinhado).
 * O texto é sempre exibido como texto puro; as posições seguem o mesmo texto guardado no backend.
 */
export function TextoMarcado({ texto, marcas, marcaAtiva, aoClicarMarca, aoSelecionar, selecaoPendente, rotulo }: Props) {
  const raiz = useRef<HTMLDivElement>(null);

  const todas = useMemo<MarcaVisual[]>(() => {
    const lista = [...marcas];
    if (selecaoPendente && !marcas.some((m) => sobrepoe(m, selecaoPendente))) {
      lista.push({ chave: CHAVE_PENDENTE, inicio: selecaoPendente.inicio, fim: selecaoPendente.fim, tipoErro: '' });
    }
    return lista;
  }, [marcas, selecaoPendente]);

  const segmentos = useMemo(() => construirSegmentos(texto, todas), [texto, todas]);

  useEffect(() => {
    if (!aoSelecionar) return;
    const aoMudarSelecao = () => {
      const sel = window.getSelection();
      const container = raiz.current;
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !container) return;
      const faixa = sel.getRangeAt(0);
      if (!container.contains(faixa.startContainer) || !container.contains(faixa.endContainer)) return;
      const a = posicaoNoTexto(faixa.startContainer, faixa.startOffset, container, texto.length);
      const b = posicaoNoTexto(faixa.endContainer, faixa.endOffset, container, texto.length);
      if (a === null || b === null) return;
      let inicio = Math.max(0, Math.min(a, b));
      let fim = Math.min(texto.length, Math.max(a, b));
      // tira espaços e quebras de linha das pontas
      while (inicio < fim && /\s/.test(texto.charAt(inicio))) inicio += 1;
      while (fim > inicio && /\s/.test(texto.charAt(fim - 1))) fim -= 1;
      if (fim > inicio) aoSelecionar({ inicio, fim });
    };
    document.addEventListener('selectionchange', aoMudarSelecao);
    return () => document.removeEventListener('selectionchange', aoMudarSelecao);
  }, [aoSelecionar, texto]);

  return (
    <div ref={raiz} className={cx(styles.texto, aoSelecionar && styles.selecionavel)} role="document" aria-label={rotulo} data-raiz>
      {segmentos.map((s) => {
        if (!s.marca) {
          return (
            <span key={`${s.inicio}-${s.fim}`} data-inicio={s.inicio}>
              {s.texto}
            </span>
          );
        }
        if (s.marca.chave === CHAVE_PENDENTE) {
          return (
            <span key={CHAVE_PENDENTE} data-inicio={s.inicio} className={styles.pendente}>
              {s.texto}
            </span>
          );
        }
        const info = infoDoTipo(s.marca.tipoErro);
        const marca = s.marca;
        return (
          <span
            key={`m-${marca.chave}`}
            data-inicio={s.inicio}
            role="button"
            tabIndex={0}
            aria-label={`Trecho marcado: ${info.valor}`}
            className={cx(styles.marca, styles[info.estilo], marcaAtiva === marca.chave && styles.ativa)}
            onClick={() => aoClicarMarca?.(marca)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                aoClicarMarca?.(marca);
              }
            }}
          >
            {s.texto}
          </span>
        );
      })}
    </div>
  );
}