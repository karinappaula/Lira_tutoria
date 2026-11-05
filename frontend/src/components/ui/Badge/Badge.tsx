import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Badge.module.scss';

export type TomDoBadge = 'neutro' | 'sucesso' | 'alerta' | 'perigo';

export function Badge({
  tom = 'neutro',
  children,
  className,
}: {
  tom?: TomDoBadge;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx(styles.badge, styles[tom], className)}>{children}</span>;
}
