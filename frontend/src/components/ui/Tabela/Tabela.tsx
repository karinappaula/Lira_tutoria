import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Tabela.module.scss';

export interface Coluna<T> {
  chave: string;
  titulo: string;
  alinhamento?: 'esquerda' | 'centro' | 'direita';
  /** Como mostrar a célula. Texto da API é sempre renderizado como texto puro. */
  celula: (linha: T) => ReactNode;
  /**
   * Como a coluna aparece no cartão do celular:
   * 'titulo' = destaque no topo · 'campo' = "Rótulo: valor" · 'acoes' = botões no rodapé · 'oculto' = não aparece.
   * Padrão: a primeira coluna é o título e as demais são campos.
   */
  noCartao?: 'titulo' | 'campo' | 'acoes' | 'oculto';
}

interface Props<T> {
  colunas: Coluna<T>[];
  linhas: T[];
  chaveDaLinha: (linha: T) => string | number;
  /** Texto lido por leitores de tela */
  descricao: string;
}

/**
 * Computador e tablet: tabela no estilo do protótipo.
 * Celular: cada linha vira um cartão (sem rolagem horizontal).
 */
export function Tabela<T>({ colunas, linhas, chaveDaLinha, descricao }: Props<T>) {
  const papel = (c: Coluna<T>, indice: number) => c.noCartao ?? (indice === 0 ? 'titulo' : 'campo');
  const titulo = colunas.find((c, i) => papel(c, i) === 'titulo');
  const campos = colunas.filter((c, i) => papel(c, i) === 'campo');
  const acoes = colunas.filter((c, i) => papel(c, i) === 'acoes');

  return (
    <>
      <div className={styles.rolagem}>
        <table className={styles.tabela}>
          <caption className={styles.legenda}>{descricao}</caption>
          <thead>
            <tr>
              {colunas.map((c) => (
                <th key={c.chave} scope="col" className={cx(styles.th, styles[c.alinhamento ?? 'esquerda'])}>
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={chaveDaLinha(linha)} className={styles.linha}>
                {colunas.map((c) => (
                  <td key={c.chave} className={cx(styles.td, styles[c.alinhamento ?? 'esquerda'])}>
                    {c.celula(linha)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={styles.cartoes} aria-label={descricao}>
        {linhas.map((linha) => (
          <li key={chaveDaLinha(linha)} className={styles.cartao}>
            {titulo && <div className={styles.cartaoTitulo}>{titulo.celula(linha)}</div>}
            {campos.length > 0 && (
              <dl className={styles.campos}>
                {campos.map((c) => (
                  <div key={c.chave} className={styles.campo}>
                    <dt>{c.titulo}</dt>
                    <dd>{c.celula(linha)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {acoes.length > 0 && (
              <div className={styles.cartaoAcoes}>
                {acoes.map((c) => (
                  <div key={c.chave}>{c.celula(linha)}</div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}