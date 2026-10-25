import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './Button.module.scss';

type Variante = 'primario' | 'secundario' | 'escuro' | 'perigo' | 'texto';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: 'sm' | 'md' | 'lg';
  /** Formato de pílula (usado nas telas de entrada) */
  pilula?: boolean;
  larguraTotal?: boolean;
  carregando?: boolean;
  icone?: ReactNode;
}

export function Button({
  variante = 'primario',
  tamanho = 'md',
  pilula = false,
  larguraTotal = false,
  carregando = false,
  icone,
  disabled,
  className,
  children,
  type = 'button',
  ...resto
}: Props) {
  return (
    <button
      type={type}
      className={cx(
        styles.botao,
        styles[variante],
        styles[tamanho],
        pilula && styles.pilula,
        larguraTotal && styles.total,
        className,
      )}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? <Spinner tamanho="sm" rotulo="Aguarde" className={styles.spinner} /> : icone}
      <span>{children}</span>
    </button>
  );
}
