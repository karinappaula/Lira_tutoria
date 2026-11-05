'use client';

import { useMemo, useRef } from 'react';
import { Trash2 } from 'lucide-react';
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
  /** Callback para apagar o destaque diretamente no texto a partir do popover flutuante */
  aoExcluirMarca?: (marca: MarcaVisual) => void;
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
export function TextoMarcado({ texto, marcas, marcaAtiva, aoClicarMarca, aoExcluirMarca, aoSelecionar, selecaoPendente, rotulo }: Props) {
  const raiz = useRef<HTMLDivElement>(null);

  const todas = useMemo<MarcaVisual[]>(() => {
    const lista = [...marcas];
    if (selecaoPendente && !marcas.some((m) => sobrepoe(m, selecaoPendente))) {
      lista.push({ chave: CHAVE_PENDENTE, inicio: selecaoPendente.inicio, fim: selecaoPendente.fim, tipoErro: '' });
    }
    return lista;
  }, [marcas, selecaoPendente]);

  const segmentos = useMemo(() => construirSegmentos(texto, todas), [texto, todas]);

  const tratarSelecao = () => {
    if (!aoSelecionar) return;
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || sel.toString().trim().length === 0) return;
    const container = raiz.current;
    if (!container) return;
    const faixa = sel.getRangeAt(0);
    if (!container.contains(faixa.startContainer) || !container.contains(faixa.endContainer)) return;
    const a = posicaoNoTexto(faixa.startContainer, faixa.startOffset, container, texto.length);
    const b = posicaoNoTexto(faixa.endContainer, faixa.endOffset, container, texto.length);
    if (a === null || b === null) return;
    let inicio = Math.max(0, Math.min(a, b));
    let fim = Math.min(texto.length, Math.max(a, b));
    while (inicio < fim && /\s/.test(texto.charAt(inicio))) inicio += 1;
    while (fim > inicio && /\s/.test(texto.charAt(fim - 1))) fim -= 1;
    if (fim > inicio) aoSelecionar({ inicio, fim });
  };

  return (
    <div
      ref={raiz}
      className={cx(styles.texto, aoSelecionar && styles.selecionavel)}
      role="document"
      aria-label={rotulo}
      data-raiz
      onMouseUp={tratarSelecao}
    >
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
        const clicavel = Boolean(aoClicarMarca);
        const ehAtiva = marcaAtiva === marca.chave || (marcaAtiva !== null && marcaAtiva !== undefined && String(marcaAtiva) === String(marca.chave));
        return (
          <span
            key={`m-${marca.chave}`}
            id={`marca-trecho-${marca.chave}`}
            data-inicio={s.inicio}
            role={clicavel ? 'button' : undefined}
            tabIndex={clicavel ? 0 : undefined}
            aria-label={`Trecho marcado: ${info.valor}. ${marca.sugestao || ''}`}
            className={cx(
              styles.marca,
              styles[info.estilo],
              ehAtiva && styles.ativa,
              !clicavel && styles.marcaSemClique,
            )}
            onClick={(e) => {
              if (clicavel) {
                e.stopPropagation();
                aoClicarMarca?.(marca);
              }
            }}
            onKeyDown={
              clicavel
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      aoClicarMarca?.(marca);
                    }
                  }
                : undefined
            }
          >
            {s.texto}
            <span
              className={styles.balaoFlutuante}
              role="tooltip"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
            >
              <strong className={styles.balaoTitulo}>{info.valor}</strong>
              {marca.sugestao ? (
                <span className={styles.balaoSugestao}>{marca.sugestao}</span>
              ) : (
                <span className={styles.balaoSemComentario}>Sem sugestão cadastrada</span>
              )}
              {aoExcluirMarca && (
                <button
                  type="button"
                  className={styles.balaoBotaoExcluir}
                  onClick={(e) => {
                    e.stopPropagation();
                    aoExcluirMarca(marca);
                  }}
                  title="Excluir marcação"
                  aria-label={`Excluir marcação: ${info.valor}`}
                >
                  <Trash2 size={13} aria-hidden="true" />
                  <span>Excluir Marcação</span>
                </button>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}