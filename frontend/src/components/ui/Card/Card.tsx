import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Card.module.scss';

interface Props extends HTMLAttributes<HTMLElement> {
  titulo?: string;
  /** Conteúdo à direita do título (botão, contador...) */
  acao?: ReactNode;
  semPreenchimento?: boolean;
}

export function Card({ titulo, acao, semPreenchimento = false, className, children, ...resto }: Props) {
  return (
    <section className={cx(styles.card, semPreenchimento && styles.semPreenchimento, className)} {...resto}>
      {(titulo || acao) && (
        <header className={styles.cabecalho}>
          {titulo && <h2 className={styles.titulo}>{titulo}</h2>}
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}
