import { CalendarClock, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { formatarDataHora } from '@/lib/formatar';
import { prazoEncerrado, urlSegura } from '@/lib/redacoes';
import type { TarefaDoAluno } from '@/types/redacoes';
import styles from './CartaoDeTarefa.module.scss';

interface Props {
  tarefa: TarefaDoAluno;
  iniciando: boolean;
  aoComecar: () => void;
}

/** Cartão de uma tarefa do Tutor que o aluno ainda não começou. */
export function CartaoDeTarefa({ tarefa, iniciando, aoComecar }: Props) {
  const encerrado = prazoEncerrado(tarefa.prazoEntrega);
  return (
    <article className={styles.cartao}>
      <header className={styles.topo}>
        <h3 className={styles.titulo}>{tarefa.tituloTarefa}</h3>
        {encerrado && <Badge tom="perigo">Prazo encerrado</Badge>}
      </header>

      {tarefa.tema && <p className={styles.tema}>Tema: {tarefa.tema.tituloTema}</p>}
      {tarefa.descricao && <p className={styles.descricao}>{tarefa.descricao}</p>}

      <p className={styles.prazo}>
        <CalendarClock size={16} aria-hidden="true" />
        Entrega até {formatarDataHora(tarefa.prazoEntrega)}
      </p>

      {tarefa.anexos.length > 0 && (
        <ul className={styles.anexos} aria-label="Anexos da tarefa">
          {tarefa.anexos.map((anexo) => {
            const url = urlSegura(anexo.caminhoArquivo);
            return (
              <li key={anexo.id}>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className={styles.anexo}>
                    <Paperclip size={14} aria-hidden="true" />
                    {anexo.nomeArquivo}
                  </a>
                ) : (
                  <span className={styles.anexo}>{anexo.nomeArquivo}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Button larguraTotal carregando={iniciando} disabled={encerrado} onClick={aoComecar}>
        {encerrado ? 'Prazo encerrado' : 'Começar'}
      </Button>
    </article>
  );
}