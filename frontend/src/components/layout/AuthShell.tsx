import type { ReactNode } from 'react';
import { RodapeGlobal } from './RodapeGlobal';
import styles from './AuthShell.module.scss';

/** Moldura das telas de entrada: faixa com logo, cartão central e rodapé global padronizado. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.moldura}>
      <header className={styles.faixa}>
        <img src="/logo-lira.png" alt="LIRA — Tutoria de Redações" className={styles.logo} width={900} height={560} />
      </header>
      <main className={styles.centro} id="conteudo">
        {children}
      </main>
      <RodapeGlobal />
    </div>
  );
}
