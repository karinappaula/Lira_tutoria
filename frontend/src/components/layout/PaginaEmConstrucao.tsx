import { Hammer } from 'lucide-react';
import { Card } from '@/components/ui/Card/Card';
import { PageHeader } from './PageHeader';
import styles from './PaginaEmConstrucao.module.scss';

/** Marcador temporário para telas das próximas fases. Será substituído pela tela real. */
export function PaginaEmConstrucao({ titulo, fase }: { titulo: string; fase: string }) {
  return (
    <>
      <PageHeader titulo={titulo} descricao={`Esta tela será construída na ${fase}.`} />
      <Card>
        <p className={styles.linha}>
          <Hammer size={22} aria-hidden="true" />
          Em construção.
        </p>
      </Card>
    </>
  );
}
