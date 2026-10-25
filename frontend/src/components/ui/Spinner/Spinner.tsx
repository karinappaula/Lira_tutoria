import { cx } from '@/lib/cx';
import styles from './Spinner.module.scss';

interface Props {
  tamanho?: 'sm' | 'md' | 'lg';
  /** Texto lido por leitores de tela */
  rotulo?: string;
  className?: string;
}

export function Spinner({ tamanho = 'md', rotulo = 'Carregando', className }: Props) {
  return (
    <span role="status" className={cx(styles.spinner, styles[tamanho], className)}>
      <span className={styles.aro} aria-hidden="true" />
      <span className={styles.oculto}>{rotulo}</span>
    </span>
  );
}

/** Carregamento ocupando a área da página, para telas que buscam dados. */
export function CarregandoPagina({ rotulo = 'Carregando' }: { rotulo?: string }) {
  return (
    <div className={styles.pagina}>
      <Spinner tamanho="lg" rotulo={rotulo} />
      <p className={styles.texto} aria-hidden="true">
        {rotulo}...
      </p>
    </div>
  );
}
