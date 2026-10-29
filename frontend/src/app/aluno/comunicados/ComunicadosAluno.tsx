'use client';

import { useEffect, useState } from 'react';
import { Eye, Mail, MailOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { ModalVisualizarComunicado } from '@/components/comunicados/ModalVisualizarComunicado';
import { useBuscar } from '@/hooks/useBuscar';
import { cx } from '@/lib/cx';
import { formatarDataHora } from '@/lib/formatar';
import { comunicadosService, EVENTO_COMUNICADOS_MUDOU } from '@/services/comunicados';
import type { ComunicadoRecebido } from '@/types/comunicados';
import styles from './ComunicadosAluno.module.scss';

export function ComunicadosAluno() {
  const [filtroLido, setFiltroLido] = useState<'TODOS' | 'NAO_LIDOS'>('TODOS');
  const [comunicadoVisualizando, setComunicadoVisualizando] = useState<ComunicadoRecebido | null>(null);

  const apenasNaoLidos = filtroLido === 'NAO_LIDOS';
  const {
    dados: comunicadosRaw,
    carregando,
    erro,
    recarregar,
  } = useBuscar((signal) => comunicadosService.listarRecebidos(apenasNaoLidos, signal), String(apenasNaoLidos));

  useEffect(() => {
    function aoMudar() {
      void recarregar();
    }
    window.addEventListener(EVENTO_COMUNICADOS_MUDOU, aoMudar);
    return () => window.removeEventListener(EVENTO_COMUNICADOS_MUDOU, aoMudar);
  }, [recarregar]);

  const comunicados = comunicadosRaw ?? [];
  const totalNaoLidos = comunicados.filter((c) => !c.lido).length;

  return (
    <div className={styles.container}>
      <PageHeader
        titulo="Comunicados e Avisos"
        descricao="Consulte avisos pedagógicos, recados gerais e comunicados enviados diretamente pelo seu tutor."
      />

      {/* Barra de Filtros */}
      <div className={styles.barraFiltros}>
        <div className={styles.contador}>
          {totalNaoLidos > 0 ? (
            <span>Você tem <strong>{totalNaoLidos}</strong> comunicado(s) não lido(s)</span>
          ) : (
            <span>Todos os comunicados estão em dia!</span>
          )}
        </div>

        <div className={styles.filtroSelect}>
          <Select
            rotulo="Filtrar por Leitura"
            value={filtroLido}
            onChange={(e) => setFiltroLido(e.target.value as 'TODOS' | 'NAO_LIDOS')}
          >
            <option value="TODOS">Todos os Comunicados</option>
            <option value="NAO_LIDOS">Apenas Não Lidos</option>
          </Select>
        </div>
      </div>

      {/* Lista de Comunicados */}
      {carregando ? (
        <CarregandoPagina rotulo="Carregando seus comunicados..." />
      ) : erro ? (
        <ErrorState mensagem={erro.message} aoTentarNovamente={recarregar} />
      ) : comunicados.length === 0 ? (
        <EmptyState
          titulo="Caixa de entrada vazia"
          descricao={
            apenasNaoLidos
              ? 'Você não possui nenhum comunicado não lido no momento.'
              : 'Seu tutor ainda não enviou nenhum comunicado para você.'
          }
        />
      ) : (
        <div className={styles.listaComunicados}>
          {comunicados.map((c) => (
            <article
              key={c.idComunicado}
              className={cx(styles.cardComunicado, !c.lido && styles.naoLido)}
            >
              <div className={styles.topoCard}>
                <div className={styles.identificacao}>
                  <h3 className={styles.titulo}>{c.tituloComunicado}</h3>
                  <span className={styles.metadados}>
                    Enviado por {c.remetente?.nome ?? 'Tutor'} em {formatarDataHora(c.dataEnvio)}
                  </span>
                </div>

                <div>
                  {!c.lido ? (
                    <Badge tom="alerta">
                      <Mail size={12} className={styles.iconeBadge} aria-hidden="true" />
                      Novo / Não Lido
                    </Badge>
                  ) : (
                    <Badge tom="neutro">
                      <MailOpen size={12} className={styles.iconeBadge} aria-hidden="true" />
                      Lido
                    </Badge>
                  )}
                </div>
              </div>

              <p className={styles.previaMensagem}>{c.mensagem}</p>

              <div className={styles.rodapeCard}>
                <Button
                  variante={c.lido ? 'secundario' : 'primario'}
                  tamanho="sm"
                  icone={<Eye size={14} aria-hidden="true" />}
                  onClick={() => setComunicadoVisualizando(c)}
                >
                  Ler Comunicado
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de Leitura */}
      <ModalVisualizarComunicado
        aberto={Boolean(comunicadoVisualizando)}
        aoFechar={() => setComunicadoVisualizando(null)}
        comunicado={comunicadoVisualizando}
        aoMarcarLido={() => {
          recarregar();
        }}
      />
    </div>
  );
}
