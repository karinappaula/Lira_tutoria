import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Badge.module.scss';

export type TomDoBadge = 'neutro' | 'sucesso' | 'alerta' | 'perigo';

export function Badge({ tom = 'neutro', children }: { tom?: TomDoBadge; children: ReactNode }) {
  return <span className={cx(styles.badge, styles[tom])}>{children}</span>;
}
