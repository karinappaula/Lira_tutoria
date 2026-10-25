import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cx } from '@/lib/cx';
import styles from './Alerta.module.scss';

type Tom = 'erro' | 'sucesso' | 'info';

const ICONES = { erro: AlertCircle, sucesso: CheckCircle2, info: Info };

/** Aviso dentro da página/formulário (diferente do Toast, que é temporário). */
export function Alerta({ tom = 'info', children }: { tom?: Tom; children: ReactNode }) {
  const Icone = ICONES[tom];
  return (
    <div className={cx(styles.alerta, styles[tom])} role={tom === 'erro' ? 'alert' : 'status'}>
      <Icone size={20} aria-hidden="true" className={styles.icone} />
      <div>{children}</div>
    </div>
  );
}
