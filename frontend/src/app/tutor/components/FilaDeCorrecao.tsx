'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge/Badge';
import { LinkBotao } from '@/components/ui/Button/LinkBotao';
import { Select } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useBuscar } from '@/hooks/useBuscar';
import { formatarDataHora } from '@/lib/formatar';
import { tutorService } from '@/services/tutor';
import type { ItemDaFila } from '@/types/correcoes';
import styles from './Tutor.module.scss';

const titulo = (i: ItemDaFila) => i.redacao.tema?.tituloTema ?? i.redacao.tarefa?.tituloTarefa ?? 'Redação sem tema';

type TipoFiltro = 'TODOS' | 'TREINO' | 'AVALIATIVA' | 'REESCRITA';

export function FilaDeCorrecao() {
  const { dados, carregando, erro, recarregar } = useBuscar((signal) => tutorService.fila(signal));
  const [filtro, setFiltro] = useState<TipoFiltro>('TODOS');

  const todos = dados ?? [];
  const totalTreino = useMemo(() => todos.filter((i) => i.redacao.tipoFluxo === 'TREINO').length, [todos]);
  const totalAvaliativa = useMemo(() => todos.filter((i) => i.redacao.tipoFluxo === 'AVALIATIVA').length, [todos]);
  const totalReescrita = useMemo(() => todos.filter((i) => i.numeroVersao === 2).length, [todos]);

  const dadosFiltrados = useMemo(() => {
    return todos.filter((i) => {
      if (filtro === 'TREINO') return i.redacao.tipoFluxo === 'TREINO';
      if (filtro === 'AVALIATIVA') return i.redacao.tipoFluxo === 'AVALIATIVA';
      if (filtro === 'REESCRITA') return i.numeroVersao === 2;
      return true;
    });
  }, [todos, filtro]);

  const ajustes = dadosFiltrados.filter((i) => i.statusVersao === 'AJUSTE_SOLICITADO');
  const aguardando = dadosFiltrados.filter((i) => i.statusVersao === 'ENVIADA');

  const colunasAjuste: Coluna<ItemDaFila>[] = [
    {
      chave: 'redacao',
      titulo: 'Redação',
      alinhamento: 'esquerda',
      celula: (i) => (
        <div className={styles.dupla}>
          <div className={styles.linhaTituloFila}>
            <strong>{titulo(i)}</strong>
          </div>
          <span>{i.redacao.aluno.usuario.nome}</span>
        </div>
      ),
    },
    {
      chave: 'versao',
      titulo: 'Versão',
      alinhamento: 'centro',
      celula: (i) =>
        i.numeroVersao === 2 ? (
          <Badge tom="alerta">V2 (Reescrita)</Badge>
        ) : (
          <Badge tom="neutro">V1</Badge>
        ),
    },
    {
      chave: 'solicitacao',
      titulo: 'Pedido',
      alinhamento: 'centro',
      celula: (i) => <Badge tom="perigo">{`${(i.correcoes[0]?.numeroAjuste ?? 0) + 1}ª solicitação`}</Badge>,
    },
    {
      chave: 'observacao',
      titulo: 'Observação da Administração',
      celula: (i) => <span className={styles.observacao}>{i.correcoes[0]?.comentarioAjusteAdmin ?? '—'}</span>,
    },
    {
      chave: 'acao',
      titulo: 'Ação',
      alinhamento: 'centro',
      noCartao: 'acoes',
      celula: (i) => <LinkBotao href={`/tutor/fila/${i.idRedacao}`}>Corrigir novamente</LinkBotao>,
    },
  ];

  const colunasAguardando: Coluna<ItemDaFila>[] = [
    {
      chave: 'redacao',
      titulo: 'Redação',
      alinhamento: 'esquerda',
      celula: (i) => (
        <div className={styles.dupla}>
          <div className={styles.linhaTituloFila}>
            <strong>{titulo(i)}</strong>
          </div>
          <span>{i.redacao.aluno.usuario.nome}</span>
        </div>
      ),
    },
    {
      chave: 'versao',
      titulo: 'Versão',
      alinhamento: 'centro',
      celula: (i) =>
        i.numeroVersao === 2 ? (
          <Badge tom="alerta">V2 (Reescrita)</Badge>
        ) : (
          <Badge tom="neutro">V1</Badge>
        ),
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      alinhamento: 'centro',
      celula: (i) => (
        <Badge tom={i.redacao.tipoFluxo === 'TREINO' ? 'neutro' : 'sucesso'}>
          {i.redacao.tipoFluxo === 'TREINO' ? 'Treino' : 'Avaliativa'}
        </Badge>
      ),
    },
    {
      chave: 'envio',
      titulo: 'Enviada em',
      alinhamento: 'centro',
      celula: (i) => (i.dataEnvio ? formatarDataHora(i.dataEnvio) : '—'),
    },
    {
      chave: 'acao',
      titulo: 'Ação',
      alinhamento: 'centro',
      noCartao: 'acoes',
      celula: (i) => <LinkBotao href={`/tutor/fila/${i.idRedacao}`}>Corrigir</LinkBotao>,
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Fila de correção"
        descricao="Corrija os textos submetidos ou reavalie tarefas a pedido dos administradores."
        aoRecarregar={recarregar}
      />
      {carregando ? (
        <CarregandoPagina rotulo="Carregando a fila" />
      ) : erro ? (
        <ErrorState mensagem={erro.message} conexao={erro.ehErroDeConexao} aoTentarNovamente={recarregar} />
      ) : (
        <div className={styles.secoes}>
          <div className={styles.barraFerramentas}>
            <div className={styles.filtro}>
              <Select
                rotulo="Filtrar por tipo"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as TipoFiltro)}
              >
                <option value="TODOS">Todos ({todos.length})</option>
                <option value="TREINO">Treino ({totalTreino})</option>
                <option value="AVALIATIVA">Avaliativa ({totalAvaliativa})</option>
                <option value="REESCRITA">Reescrita ({totalReescrita})</option>
              </Select>
            </div>
          </div>

          <section aria-labelledby="titulo-ajustes">
            <h2 id="titulo-ajustes" className={styles.subtitulo}>
              Ajustes solicitados pelo Admin
            </h2>
            {ajustes.length === 0 ? (
              <div className={styles.vazio}>
                <p>Nenhum ajuste solicitado no momento.</p>
              </div>
            ) : (
              <Tabela colunas={colunasAjuste} linhas={ajustes} chaveDaLinha={(i) => i.id} descricao="Redações com ajuste solicitado" />
            )}
          </section>
          <section aria-labelledby="titulo-primeira">
            <h2 id="titulo-primeira" className={styles.subtitulo}>
              Aguardando correção
            </h2>
            {aguardando.length === 0 ? (
              <div className={styles.vazio}>
                <EmptyState
                  titulo="Nenhuma redação pendente de correção com o filtro selecionado."
                  descricao="Quando um tutorado enviar uma redação correspondente, ela aparece aqui."
                />
              </div>
            ) : (
              <Tabela colunas={colunasAguardando} linhas={aguardando} chaveDaLinha={(i) => i.id} descricao="Redações aguardando correção" />
            )}
          </section>
        </div>
      )}
    </>
  );
}