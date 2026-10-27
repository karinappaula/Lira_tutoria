import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Button.module.scss';
import estilos from './LinkBotao.module.scss';

/** Link com a aparência de um botão (para navegar entre telas). */
export function LinkBotao({
  href,
  children,
  variante = 'primario',
  tamanho = 'md',
}: {
  href: string;
  children: ReactNode;
  variante?: 'primario' | 'secundario';
  tamanho?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Link href={href} className={cx(styles.botao, styles[variante], styles[tamanho], estilos.link)}>
      {children}
    </Link>
  );
}