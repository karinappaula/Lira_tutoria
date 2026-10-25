import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge/Badge';
import { formatarDataHora } from '@/lib/formatar';
import { prazoEncerrado } from '@/lib/redacoes';
import type { Redacao } from '@/types/redacoes';
import styles from './PainelDoTema.module.scss';

/** Tema, texto motivador e prazo da redação. Textos da API são sempre exibidos como texto puro. */
export function PainelDoTema({ redacao }: { redacao: Redacao }) {
  const tema = redacao.tema;
  const tarefa = redacao.tarefa;
  return (
    <div className={styles.painel}>
      <h3 className={styles.titulo}>{tema?.tituloTema ?? 'Sem tema definido'}</h3>
      {tema?.textoMotivador ? <p className={styles.motivador}>{tema.textoMotivador}</p> : <p className={styles.vazio}>Este tema não tem texto motivador.</p>}
      {tarefa && (
        <div className={styles.prazo}>
          <CalendarClock size={16} aria-hidden="true" />
          <span>Entrega até {formatarDataHora(tarefa.prazoEntrega)}</span>
          {prazoEncerrado(tarefa.prazoEntrega) && <Badge tom="perigo">Prazo encerrado</Badge>}
        </div>
      )}
    </div>
  );
}