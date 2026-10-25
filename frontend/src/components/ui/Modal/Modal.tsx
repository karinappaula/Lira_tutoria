'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.scss';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  /** Botões de ação, alinhados à direita */
  rodape?: ReactNode;
}

/** Janela modal usando o elemento nativo <dialog>: foco preso, Esc fecha e leitor de tela entende. */
export function Modal({ aberto, aoFechar, titulo, children, rodape }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-labelledby={idTitulo}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === ref.current) aoFechar(); // clique no fundo escuro
      }}
    >
      <div className={styles.conteudo}>
        <header className={styles.cabecalho}>
          <h2 id={idTitulo} className={styles.titulo}>
            {titulo}
          </h2>
          <button type="button" className={styles.fechar} onClick={aoFechar} aria-label="Fechar">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.corpo}>{children}</div>
        {rodape && <footer className={styles.rodape}>{rodape}</footer>}
      </div>
    </dialog>
  );
}
