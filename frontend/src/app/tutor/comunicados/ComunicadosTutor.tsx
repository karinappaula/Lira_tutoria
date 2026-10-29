'use client';

import { useEffect, useState } from 'react';
import { Eye, Inbox, Plus, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { ModalNovoComunicado } from '@/components/comunicados/ModalNovoComunicado';
import { ModalVisualizarComunicado } from '@/components/comunicados/ModalVisualizarComunicado';
import { useBuscar } from '@/hooks/useBuscar';
import { cx } from '@/lib/cx';
import { formatarDataHora } from '@/lib/formatar';
import { comunicadosService, EVENTO_COMUNICADOS_MUDOU } from '@/services/comunicados';
import type { ComunicadoEnviado, ComunicadoRecebido } from '@/types/comunicados';
import styles from './ComunicadosTutor.module.scss';

export function ComunicadosTutor() {
  const [abaAtiva, setAbaAtiva] = useState<'recebidos' | 'enviados'>('recebidos');
  const [filtroLido, setFiltroLido] = useState<'TODOS' | 'NAO_LIDOS'>('TODOS');

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [comunicadoVisualizando, setComunicadoVisualizando] = useState<
    ComunicadoRecebido | ComunicadoEnviado | null
  >(null);

  // Query: Recebidos da Administração
  const apenasNaoLidos = filtroLido === 'NAO_LIDOS';
  const {
    dados: recebidosRaw,
    carregando: carregandoRecebidos,
    erro: erroRecebidos,
    recarregar: recarregarRecebidos,
  } = useBuscar((signal) => comunicadosService.listarRecebidos(apenasNaoLidos, signal), String(apenasNaoLidos));

  // Query: Enviados para os Tutorados
  const {
    dados: enviadosRaw,
    carregando: carregandoEnviados,
    erro: erroEnviados,
    recarregar: recarregarEnviados,
  } = useBuscar((signal) => comunicadosService.listarEnviados(signal));

  useEffect(() => {
    function aoMudar() {
      void recarregarRecebidos();
      void recarregarEnviados();
    }
    window.addEventListener(EVENTO_COMUNICADOS_MUDOU, aoMudar);
    return () => window.removeEventListener(EVENTO_COMUNICADOS_MUDOU, aoMudar);
  }, [recarregarRecebidos, recarregarEnviados]);

  const listaRecebidos = recebidosRaw ?? [];
  const listaEnviados = enviadosRaw ?? [];
  const totalNaoLidos = listaRecebidos.filter((c) => !c.lido).length;

  // Colunas de Recebidos
  const colunasRecebidos: Coluna<ComunicadoRecebido>[] = [
    {
      chave: 'status',
      titulo: 'Status',
      alinhamento: 'centro',
      celula: (c) => (
        <Badge tom={c.lido ? 'neutro' : 'alerta'}>{c.lido ? 'Lido' : 'Não Lido'}</Badge>
      ),
    },
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
      chave: 'remetente',
      titulo: 'Remetente',
      celula: (c) => c.remetente?.nome ?? 'Administração',
    },
    {
      chave: 'data',
      titulo: 'Data',
      alinhamento: 'centro',
      celula: (c) => formatarDataHora(c.dataEnvio),
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (c) => (
        <div className={styles.grupoAcoes}>
          <Button
            variante={c.lido ? 'secundario' : 'primario'}
            tamanho="sm"
            icone={<Eye size={14} aria-hidden="true" />}
            onClick={() => setComunicadoVisualizando(c)}
          >
            Ler Comunicado
          </Button>
        </div>
      ),
    },
  ];

  // Colunas de Enviados
  const colunasEnviados: Coluna<ComunicadoEnviado>[] = [
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
      celula: (c) => `${c.quantidadeDestinatarios} aluno(s)`,
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
          <Badge tom={taxa === 100 ? 'sucesso' : taxa > 0 ? 'alerta' : 'neutro'}>
            {c.quantidadeLidos} / {c.quantidadeDestinatarios} ({taxa}%)
          </Badge>
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

  const carregando = carregandoRecebidos || carregandoEnviados;
  const erro = erroRecebidos || erroEnviados;

  return (
    <div className={styles.container}>
      <PageHeader
        titulo="Central de Comunicados"
        descricao="Consulte avisos recebidos da administração e envie comunicados diretos aos seus tutorados."
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

      {/* Barra de Controles (Abas + Filtro) */}
      <div className={styles.barraControles}>
        <div className={styles.abas} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'recebidos'}
            className={cx(styles.abaBotao, abaAtiva === 'recebidos' && styles.ativa)}
            onClick={() => setAbaAtiva('recebidos')}
          >
            <Inbox size={16} aria-hidden="true" />
            Caixa de Entrada {totalNaoLidos > 0 && `(${totalNaoLidos} novos)`}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'enviados'}
            className={cx(styles.abaBotao, abaAtiva === 'enviados' && styles.ativa)}
            onClick={() => setAbaAtiva('enviados')}
          >
            <Send size={16} aria-hidden="true" />
            Enviados aos Alunos ({listaEnviados.length})
          </button>
        </div>

        {abaAtiva === 'recebidos' && (
          <div className={styles.filtroStatus}>
            <Select
              rotulo="Filtrar por Leitura"
              value={filtroLido}
              onChange={(e) => setFiltroLido(e.target.value as 'TODOS' | 'NAO_LIDOS')}
            >
              <option value="TODOS">Todos os Comunicados</option>
              <option value="NAO_LIDOS">Apenas Não Lidos</option>
            </Select>
          </div>
        )}
      </div>

      {/* Conteúdo das Abas */}
      {carregando ? (
        <CarregandoPagina rotulo="Carregando comunicados..." />
      ) : erro ? (
        <ErrorState
          mensagem={erro.message}
          aoTentarNovamente={() => {
            recarregarRecebidos();
            recarregarEnviados();
          }}
        />
      ) : abaAtiva === 'recebidos' ? (
        listaRecebidos.length === 0 ? (
          <EmptyState
            titulo="Caixa de entrada vazia"
            descricao={
              apenasNaoLidos
                ? 'Você não possui comunicados pendentes de leitura.'
                : 'Você ainda não recebeu nenhum comunicado da administração.'
            }
          />
        ) : (
          <div className={styles.tabelaContainer}>
            <Tabela<ComunicadoRecebido>
              colunas={colunasRecebidos}
              linhas={listaRecebidos}
              chaveDaLinha={(c) => c.idComunicado}
              descricao="Tabela de comunicados recebidos da administração"
            />
          </div>
        )
      ) : listaEnviados.length === 0 ? (
        <EmptyState
          titulo="Nenhum comunicado enviado ainda"
          descricao="Você ainda não disparou avisos para os seus tutorados. Clique em 'Novo Comunicado' para emitir uma mensagem."
        />
      ) : (
        <div className={styles.tabelaContainer}>
          <Tabela<ComunicadoEnviado>
            colunas={colunasEnviados}
            linhas={listaEnviados}
            chaveDaLinha={(c) => c.id}
            descricao="Tabela de comunicados enviados aos seus tutorados"
          />
        </div>
      )}

      {/* Modal de Envio para Tutorados */}
      <ModalNovoComunicado
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        aoSucesso={() => {
          recarregarEnviados();
          setAbaAtiva('enviados');
        }}
        papel="TUTOR"
      />

      {/* Modal de Leitura / Detalhes */}
      <ModalVisualizarComunicado
        aberto={Boolean(comunicadoVisualizando)}
        aoFechar={() => setComunicadoVisualizando(null)}
        comunicado={comunicadoVisualizando}
        aoMarcarLido={() => {
          recarregarRecebidos();
        }}
      />
    </div>
  );
}
