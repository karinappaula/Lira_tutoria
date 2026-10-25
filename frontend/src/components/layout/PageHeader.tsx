import type { ReactNode } from 'react';
import styles from './PageHeader.module.scss';

/** Título + descrição da página, com ação opcional à direita (ex.: "+ Nova tarefa"). */
export function PageHeader({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className={styles.topo}>
      <div>
        <h1 className={styles.titulo}>{titulo}</h1>
        {descricao && <p className={styles.descricao}>{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
