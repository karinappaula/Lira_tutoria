import { CalendarClock, ExternalLink, FileText, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/Badge/Badge';
import { formatarDataHora } from '@/lib/formatar';
import { prazoEncerrado, urlSegura } from '@/lib/redacoes';
import type { Redacao } from '@/types/redacoes';
import styles from './PainelDoTema.module.scss';

/** Tema, texto motivador, anexo complementar e prazo da redação. */
export function PainelDoTema({ redacao }: { redacao: Redacao }) {
  const tema = redacao.tema;
  const tarefa = redacao.tarefa;

  const urlBruta =
    tarefa?.anexoUrl ||
    tarefa?.arquivoUrl ||
    tarefa?.anexos?.[0]?.caminhoArquivo ||
    null;

  const urlAnexo = urlBruta ? urlSegura(urlBruta) : null;
  const nomeArquivo = tarefa?.anexos?.[0]?.nomeArquivo ?? 'Material complementar da tarefa';

  return (
    <div className={styles.painel}>
      <div className={styles.secao}>
        <h4 className={styles.subtituloSecao}>Tema</h4>
        <h3 className={styles.titulo}>{tema?.tituloTema ?? 'Sem tema definido'}</h3>
      </div>

      <div className={styles.secao}>
        <h4 className={styles.subtituloSecao}>Texto Motivador</h4>
        {tema?.textoMotivador ? (
          <p className={styles.motivador}>{tema.textoMotivador}</p>
        ) : (
          <p className={styles.vazio}>Este tema não tem texto motivador.</p>
        )}
      </div>

      {tarefa && (
        <div className={styles.blocoAnexo}>
          <h4 className={styles.subtituloSecao}>Anexo Complementar</h4>
          {urlAnexo ? (
            <div className={styles.cardAnexo}>
              <div className={styles.cardAnexoInfo}>
                <Paperclip size={16} className={styles.iconeClipe} aria-hidden="true" />
                <span className={styles.nomeAnexo} title={nomeArquivo}>
                  {nomeArquivo}
                </span>
              </div>
              <a
                href={urlAnexo}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.botaoVisualizarAnexo}
              >
                <FileText size={18} aria-hidden="true" />
                <span>Visualizar Anexo da Tarefa (PDF/Imagem)</span>
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
          ) : (
            <div className={styles.cardAnexoVazio}>
              <Paperclip size={16} aria-hidden="true" />
              <span>Nenhum anexo complementar incluído nesta tarefa.</span>
            </div>
          )}
        </div>
      )}

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
