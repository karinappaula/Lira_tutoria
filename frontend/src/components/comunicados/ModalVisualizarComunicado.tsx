'use client';

import { useEffect, type CSSProperties } from 'react';
import { Eye, Send } from 'lucide-react';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { formatarDataHora } from '@/lib/formatar';
import { comunicadosService } from '@/services/comunicados';
import type { ComunicadoEnviado, ComunicadoRecebido } from '@/types/comunicados';
import styles from './ModalVisualizarComunicado.module.scss';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  comunicado: ComunicadoRecebido | ComunicadoEnviado | null;
  aoMarcarLido?: () => void;
}

export function ModalVisualizarComunicado({ aberto, aoFechar, comunicado, aoMarcarLido }: Props) {
  useEffect(() => {
    if (!aberto || !comunicado) return;

    // Se for recebido e ainda não lido, marca automaticamente como lido
    if ('idComunicado' in comunicado && !comunicado.lido) {
      void comunicadosService.marcarComoLido(comunicado.idComunicado).then(() => {
        aoMarcarLido?.();
      });
    }
  }, [aberto, comunicado, aoMarcarLido]);

  if (!comunicado) return null;

  const ehEnviado = 'quantidadeDestinatarios' in comunicado;
  const titulo = comunicado.tituloComunicado;
  const mensagem = comunicado.mensagem;
  const data = comunicado.dataEnvio;

  const taxaLeitura = ehEnviado && comunicado.quantidadeDestinatarios > 0
    ? Math.round((comunicado.quantidadeLidos / comunicado.quantidadeDestinatarios) * 100)
    : 0;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      rodape={
        <Button variante="secundario" onClick={aoFechar}>
          Fechar
        </Button>
      }
    >
      <div className={styles.container}>
        <div className={styles.cabecalhoDetalhes}>
          <div className={styles.identificacao}>
            <span className={styles.remetente}>
              {ehEnviado ? (
                <>Enviado por você</>
              ) : (
                <>De: {'remetente' in comunicado ? comunicado.remetente.nome : 'Administração'}</>
              )}
            </span>
            <span className={styles.data}>Data de envio: {formatarDataHora(data)}</span>
          </div>

          <div>
            {ehEnviado ? (
              <Badge tom="sucesso">
                <Send size={12} className={styles.iconeBadge} aria-hidden="true" />
                Disparado
              </Badge>
            ) : 'lido' in comunicado && comunicado.lido ? (
              <Badge tom="neutro">Lido</Badge>
            ) : (
              <Badge tom="alerta">Não Lido</Badge>
            )}
          </div>
        </div>

        {ehEnviado && (
          <div className={styles.blocoLeituras}>
            <div className={styles.topoLeituras}>
              <span>
                <Eye size={14} className={styles.iconeBadge} aria-hidden="true" />
                Leituras confirmadas: {comunicado.quantidadeLidos} de {comunicado.quantidadeDestinatarios} destinatários
              </span>
              <span>{taxaLeitura}%</span>
            </div>
            <div className={styles.trilhaLeitura}>
              <div
                className={styles.preenchimentoLeitura}
                style={{ '--largura': `${taxaLeitura}%` } as CSSProperties}
              />
            </div>
          </div>
        )}

        <p className={styles.corpoMensagem}>{mensagem}</p>
      </div>
    </Modal>
  );
}
