'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge/Badge';
import { LinkBotao } from '@/components/ui/Button/LinkBotao';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useBuscar } from '@/hooks/useBuscar';
import { formatarDataHora } from '@/lib/formatar';
import { tutorService } from '@/services/tutor';
import type { ItemDaFila } from '@/types/correcoes';
import styles from './Tutor.module.scss';

const titulo = (i: ItemDaFila) => i.redacao.tema?.tituloTema ?? i.redacao.tarefa?.tituloTarefa ?? 'Redação sem tema';

export function FilaDeCorrecao() {
  const { dados, carregando, erro, recarregar } = useBuscar((signal) => tutorService.fila(signal));

  const ajustes = (dados ?? []).filter((i) => i.statusVersao === 'AJUSTE_SOLICITADO');
  const primeiras = (dados ?? []).filter((i) => i.statusVersao === 'ENVIADA');

  const colunasAjuste: Coluna<ItemDaFila>[] = [
    {
      chave: 'redacao',
      titulo: 'Redação',
      celula: (i) => (
        <div className={styles.dupla}>
          <strong>{titulo(i)}</strong>
          <span>{i.redacao.aluno.usuario.nome}</span>
        </div>
      ),
    },
    {
      chave: 'solicitacao',
      titulo: 'Pedido',
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
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (i) => <LinkBotao href={`/tutor/fila/${i.idRedacao}`}>Corrigir novamente</LinkBotao>,
    },
  ];

  const colunasPrimeira: Coluna<ItemDaFila>[] = [
    {
      chave: 'redacao',
      titulo: 'Redação',
      celula: (i) => (
        <div className={styles.dupla}>
          <strong>{titulo(i)}</strong>
          <span>{i.redacao.aluno.usuario.nome}</span>
        </div>
      ),
    },
    { chave: 'tipo', titulo: 'Tipo', celula: (i) => (i.redacao.tipoFluxo === 'TREINO' ? 'Treino' : 'Avaliativa') },
    { chave: 'envio', titulo: 'Enviada em', celula: (i) => (i.dataEnvio ? formatarDataHora(i.dataEnvio) : '—') },
    {
      chave: 'acao',
      titulo: 'Ação',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (i) => <LinkBotao href={`/tutor/fila/${i.idRedacao}`}>Corrigir</LinkBotao>,
    },
  ];

  return (
    <>
      <PageHeader titulo="Fila de correção" descricao="Corrija os textos submetidos ou reavalie tarefas a pedido dos administradores." />
      {carregando ? (
        <CarregandoPagina rotulo="Carregando a fila" />
      ) : erro ? (
        <ErrorState mensagem={erro.message} conexao={erro.ehErroDeConexao} aoTentarNovamente={recarregar} />
      ) : (
        <div className={styles.secoes}>
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
              Aguardando primeira correção
            </h2>
            {primeiras.length === 0 ? (
              <div className={styles.vazio}>
                <EmptyState titulo="Nenhuma redação pendente de correção no momento." descricao="Quando um tutorado enviar uma redação, ela aparece aqui." />
              </div>
            ) : (
              <Tabela colunas={colunasPrimeira} linhas={primeiras} chaveDaLinha={(i) => i.id} descricao="Redações aguardando a primeira correção" />
            )}
          </section>
        </div>
      )}
    </>
  );
}