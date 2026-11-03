'use client';

import { useState, type ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import styles from './PageHeader.module.scss';

interface Props {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  aoRecarregar?: () => void;
  esconderRefresh?: boolean;
}

/** Título + descrição da página, botão discreto de refresh e ação opcional à direita (ex.: "+ Nova tarefa"). */
export function PageHeader({ titulo, descricao, acao, aoRecarregar, esconderRefresh = false }: Props) {
  const [recarregando, setRecarregando] = useState(false);
  const mostrarRefresh = Boolean(aoRecarregar) && !esconderRefresh;

  function handleRefresh() {
    if (!aoRecarregar) return;
    setRecarregando(true);
    aoRecarregar();
    setTimeout(() => setRecarregando(false), 600);
  }

  return (
    <div className={styles.topo}>
      <div className={styles.titulosWrapper}>
        <div className={styles.linhaTitulo}>
          <h1 className={styles.titulo}>{titulo}</h1>
          {mostrarRefresh && (
            <button
              type="button"
              className={styles.botaoRefresh}
              onClick={handleRefresh}
              aria-label="Atualizar dados desta página"
              title="Recarregar dados"
            >
              <RotateCw size={17} className={recarregando ? styles.girando : ''} aria-hidden="true" />
            </button>
          )}
        </div>
        {descricao && <p className={styles.descricao}>{descricao}</p>}
      </div>
      {acao && <div className={styles.acao}>{acao}</div>}
    </div>
  );
}
