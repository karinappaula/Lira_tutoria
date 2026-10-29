'use client';

import { useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { ModalNovoComunicado } from '@/components/comunicados/ModalNovoComunicado';
import { ModalVisualizarComunicado } from '@/components/comunicados/ModalVisualizarComunicado';
import { useBuscar } from '@/hooks/useBuscar';
import { formatarDataHora } from '@/lib/formatar';
import { adminService } from '@/services/admin';
import { comunicadosService } from '@/services/comunicados';
import type { ComunicadoEnviado } from '@/types/comunicados';
import styles from './ComunicadosAdmin.module.scss';

export function ComunicadosAdmin() {
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [comunicadoVisualizando, setComunicadoVisualizando] = useState<ComunicadoEnviado | null>(null);

  const {
    dados: enviados,
    carregando,
    erro,
    recarregar,
  } = useBuscar((signal) => comunicadosService.listarEnviados(signal));

  // Lista de turmas para o modal
  const { dados: turmasRaw } = useBuscar((signal) => adminService.turmas(signal));
  const turmas = turmasRaw ?? [];

  const listaEnviados = enviados ?? [];

  const colunas: Coluna<ComunicadoEnviado>[] = [
    {
      chave: 'titulo',
      titulo: 'Título e Mensagem',
      celula: (c) => (
        <div>
          <strong className={styles.tituloTabela}>
            {c.tituloComunicado}
          </strong>
          <span className={styles.resumoMensagem}>
            {c.mensagem}
          </span>
        </div>
      ),
    },
    {
      chave: 'data',
      titulo: 'Data de Envio',
      alinhamento: 'centro',
      celula: (c) => formatarDataHora(c.dataEnvio),
    },
    {
      chave: 'destinatarios',
      titulo: 'Destinatários',
      alinhamento: 'centro',
      celula: (c) => `${c.quantidadeDestinatarios} tutor(es)`,
    },
    {
      chave: 'leituras',
      titulo: 'Leituras Confirmadas',
      alinhamento: 'centro',
      celula: (c) => {
        const taxa =
          c.quantidadeDestinatarios > 0
            ? Math.round((c.quantidadeLidos / c.quantidadeDestinatarios) * 100)
            : 0;
        return (
          <div>
            <Badge tom={taxa === 100 ? 'sucesso' : taxa > 0 ? 'alerta' : 'neutro'}>
              {c.quantidadeLidos} / {c.quantidadeDestinatarios} ({taxa}%)
            </Badge>
          </div>
        );
      },
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (c) => (
        <div className={styles.grupoAcoes}>
          <Button
            variante="secundario"
            tamanho="sm"
            icone={<Eye size={14} aria-hidden="true" />}
            onClick={() => setComunicadoVisualizando(c)}
          >
            Visualizar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        titulo="Comunicados Institucionais"
        descricao="Emita comunicados institucionais aos tutores e acompanhe as taxas de leitura em tempo real."
        acao={
          <Button
            variante="primario"
            icone={<Plus size={16} aria-hidden="true" />}
            onClick={() => setModalNovoAberto(true)}
          >
            Novo Comunicado
          </Button>
        }
      />

      {carregando ? (
        <CarregandoPagina rotulo="Carregando comunicados institucionais..." />
      ) : erro ? (
        <ErrorState mensagem={erro.message} aoTentarNovamente={recarregar} />
      ) : listaEnviados.length === 0 ? (
        <EmptyState
          titulo="Nenhum comunicado enviado"
          descricao="Você ainda não disparou nenhum comunicado para a equipe de tutores. Clique em 'Novo Comunicado' para começar."
        />
      ) : (
        <div className={styles.tabelaContainer}>
          <Tabela<ComunicadoEnviado>
            colunas={colunas}
            linhas={listaEnviados}
            chaveDaLinha={(c) => c.id}
            descricao="Tabela de comunicados institucionais disparados"
          />
        </div>
      )}

      {/* Modal de Envio */}
      <ModalNovoComunicado
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        aoSucesso={recarregar}
        papel="ADMINISTRADOR"
        turmas={turmas}
      />

      {/* Modal de Visualização */}
      <ModalVisualizarComunicado
        aberto={Boolean(comunicadoVisualizando)}
        aoFechar={() => setComunicadoVisualizando(null)}
        comunicado={comunicadoVisualizando}
      />
    </div>
  );
}
