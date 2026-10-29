'use client';

import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle,
  Eye,
  Filter,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useBuscar } from '@/hooks/useBuscar';
import { formatarDataHora } from '@/lib/formatar';
import { adminService } from '@/services/admin';
import type { ItemDoHistorico } from '@/types/correcoes';
import { ModalDetalhesCorrecao } from './ModalDetalhesCorrecao';
import styles from './HistoricoAdmin.module.scss';

const TOM_STATUS: Record<string, TomDoBadge> = {
  APROVADA: 'sucesso',
  LIBERADA: 'sucesso',
  PENDENTE_APROVACAO: 'alerta',
  AJUSTE_SOLICITADO: 'perigo',
};

/** Gera os últimos 12 meses no formato AAAA-MM com o nome do mês em português. */
function ultimosMeses(): Array<{ valor: string; rotulo: string }> {
  const hoje = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rotulo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d);
    return { valor, rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) };
  });
}

export function HistoricoAdmin() {
  const meses = useMemo(ultimosMeses, []);

  // Estados dos Filtros
  const [mes, setMes] = useState<string>('');
  const [idTurma, setIdTurma] = useState<string>('');
  const [idTutor, setIdTutor] = useState<string>('');
  const [tipoFluxo, setTipoFluxo] = useState<string>('');

  // Modal de Detalhes
  const [idCorrecaoDetalhes, setIdCorrecaoDetalhes] = useState<number | null>(null);

  // Busca opções de Turmas e Tutores para alimentar os selects
  const { dados: turmasDados } = useBuscar((signal) => adminService.turmas(signal));
  const { dados: tutoresDados } = useBuscar((signal) => adminService.usuariosTutores(undefined, signal));

  const listaTurmas = turmasDados ?? [];
  const listaTutores = tutoresDados ?? [];

  // Busca o Histórico filtrado
  const chaveFiltros = `${mes}|${idTurma}|${idTutor}|${tipoFluxo}`;
  const { dados, carregando, erro, recarregar } = useBuscar(
    (signal) =>
      adminService.historicoGeral(
        {
          mes: mes || undefined,
          idTurma: idTurma ? Number(idTurma) : undefined,
          idTutor: idTutor ? Number(idTutor) : undefined,
          tipoFluxo: tipoFluxo || undefined,
        },
        signal
      ),
    chaveFiltros
  );
  const itens = dados ?? [];

  // Limpa todos os filtros
  function limparFiltros() {
    setMes('');
    setIdTurma('');
    setIdTutor('');
    setTipoFluxo('');
  }

  // Métricas analíticas do período selecionado
  const metricas = useMemo(() => {
    const total = itens.length;
    if (total === 0) {
      return {
        total: 0,
        mediaNotas: 0,
        avaliativas: 0,
        treino: 0,
        aprovadas: 0,
        ajustes: 0,
      };
    }
    const comNota = itens.filter((i) => i.notaTotal !== null);
    const somaNotas = comNota.reduce((acc, i) => acc + (i.notaTotal ?? 0), 0);
    const media = comNota.length > 0 ? Math.round(somaNotas / comNota.length) : 0;
    const avaliativas = itens.filter((i) => i.tipoFluxo === 'AVALIATIVA').length;
    const treino = itens.filter((i) => i.tipoFluxo === 'TREINO').length;
    const aprovadas = itens.filter(
      (i) => i.statusAprovacao === 'APROVADA' || i.statusAprovacao === 'LIBERADA'
    ).length;
    const ajustes = itens.filter((i) => i.statusAprovacao === 'AJUSTE_SOLICITADO').length;

    return {
      total,
      mediaNotas: media,
      avaliativas,
      treino,
      aprovadas,
      ajustes,
    };
  }, [itens]);

  const colunas: Coluna<ItemDoHistorico>[] = [
    {
      chave: 'data',
      titulo: 'Data da Correção',
      celula: (i) => (
        <span className={styles.dataLinha}>{formatarDataHora(i.data)}</span>
      ),
    },
    {
      chave: 'aluno',
      titulo: 'Aluno',
      celula: (i) => (
        <div className={styles.alunoLinha}>
          <strong>{i.aluno.nome}</strong>
        </div>
      ),
    },
    {
      chave: 'turma',
      titulo: 'Turma',
      celula: (i) => (
        <Badge tom="neutro">{i.turma?.nome ?? 'Sem turma'}</Badge>
      ),
    },
    {
      chave: 'tutor',
      titulo: 'Tutor',
      celula: (i) => i.tutor.nome,
    },
    {
      chave: 'modalidade',
      titulo: 'Modalidade',
      alinhamento: 'centro',
      celula: (i) => (
        <Badge tom={i.tipoFluxo === 'AVALIATIVA' ? 'sucesso' : 'neutro'}>
          {i.tipoFluxo}
        </Badge>
      ),
    },
    {
      chave: 'versao',
      titulo: 'Versão',
      alinhamento: 'centro',
      celula: (i) => (
        <span className={styles.versaoLinha}>
          V{i.numeroVersao}
          {i.ajustes > 0 ? ` (Aj. ${i.ajustes})` : ''}
        </span>
      ),
    },
    {
      chave: 'nota',
      titulo: 'Nota Final',
      alinhamento: 'centro',
      celula: (i) => (
        <span className={styles.notaLinha}>
          {i.notaTotal ?? '—'} <span>/ 1000</span>
        </span>
      ),
    },
    {
      chave: 'status',
      titulo: 'Status',
      alinhamento: 'centro',
      celula: (i) => (
        <Badge tom={TOM_STATUS[i.statusAprovacao] ?? 'neutro'}>
          {i.statusRotulo}
        </Badge>
      ),
    },
    {
      chave: 'acoes',
      titulo: 'Ação',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (i) => (
        <div className={styles.acoesLinha}>
          <Button
            variante="secundario"
            tamanho="sm"
            icone={<Eye size={14} aria-hidden="true" />}
            onClick={() => setIdCorrecaoDetalhes(i.idCorrecao)}
          >
            Ver correção
          </Button>
        </div>
      ),
    },
  ];

  const temFiltroAtivo = Boolean(mes || idTurma || idTutor || tipoFluxo);

  return (
    <>
      <PageHeader
        titulo="Histórico Geral de Correções"
        descricao="Auditoria, consulta e acompanhamento de todas as redações corrigidas no sistema."
      />

      {/* Cartões de Indicadores Rápidos */}
      <section className={styles.gradeMetricas} aria-label="Indicadores analíticos de correções">
        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <BookOpen size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Total no Período</span>
            <strong className={styles.valorMetrica}>{metricas.total}</strong>
            <span className={styles.subMetrica}>Redações corrigidas</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <Award size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Média Geral</span>
            <strong className={styles.valorMetrica}>{metricas.mediaNotas} / 1000</strong>
            <span className={styles.subMetrica}>Todas as modalidades</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Avaliativas vs Treino</span>
            <strong className={styles.valorMetrica}>
              {metricas.avaliativas} / {metricas.treino}
            </strong>
            <span className={styles.subMetrica}>Distribuição por fluxo</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <CheckCircle size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Aprovadas vs Ajustes</span>
            <strong className={styles.valorMetrica}>
              {metricas.aprovadas} / {metricas.ajustes}
            </strong>
            <span className={styles.subMetrica}>Controle de qualidade</span>
          </div>
        </div>
      </section>

      {/* Painel de Filtros */}
      <div className={styles.cardFiltros}>
        <div className={styles.topoFiltros}>
          <h3 className={styles.tituloFiltros}>
            <Filter size={16} aria-hidden="true" /> Filtros de Auditoria
          </h3>
          {temFiltroAtivo && (
            <Button
              variante="secundario"
              tamanho="sm"
              icone={<RotateCcw size={14} aria-hidden="true" />}
              onClick={limparFiltros}
            >
              Limpar filtros
            </Button>
          )}
        </div>

        <div className={styles.gradeFiltros}>
          <Select
            rotulo="Mês de Referência"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </Select>

          <Select
            rotulo="Filtrar por Turma"
            value={idTurma}
            onChange={(e) => setIdTurma(e.target.value)}
          >
            <option value="">Todas as turmas</option>
            {listaTurmas.map((turma) => (
              <option key={turma.id} value={String(turma.id)}>
                {turma.nome} ({turma.vestibularFoco})
              </option>
            ))}
          </Select>

          <Select
            rotulo="Filtrar por Tutor"
            value={idTutor}
            onChange={(e) => setIdTutor(e.target.value)}
          >
            <option value="">Todos os tutores</option>
            {listaTutores.map((tutor) => (
              <option key={tutor.id} value={String(tutor.id)}>
                {tutor.nome}
              </option>
            ))}
          </Select>

          <Select
            rotulo="Modalidade da Redação"
            value={tipoFluxo}
            onChange={(e) => setTipoFluxo(e.target.value)}
          >
            <option value="">Todas as modalidades</option>
            <option value="AVALIATIVA">Apenas Avaliativa</option>
            <option value="TREINO">Apenas Treino</option>
          </Select>
        </div>
      </div>

      <div className={styles.barraStatusFiltros}>
        {!carregando && !erro && (
          <p className={styles.contagem}>
            {itens.length}{' '}
            {itens.length === 1 ? 'correção encontrada' : 'correções encontradas'}
          </p>
        )}
      </div>

      {/* Conteúdo Principal */}
      {carregando ? (
        <CarregandoPagina rotulo="Carregando histórico de correções..." />
      ) : erro ? (
        <ErrorState
          mensagem={erro.message}
          conexao={erro.ehErroDeConexao}
          aoTentarNovamente={recarregar}
        />
      ) : itens.length === 0 ? (
        <div className={styles.vazio}>
          <EmptyState
            titulo="Nenhuma correção encontrada"
            descricao={
              temFiltroAtivo
                ? 'Nenhum registro corresponde aos filtros selecionados. Tente ajustar os parâmetros.'
                : 'Não há correções registradas no sistema ainda.'
            }
          />
        </div>
      ) : (
        <Tabela
          colunas={colunas}
          linhas={itens}
          chaveDaLinha={(i) => i.idCorrecao}
          descricao="Histórico geral de correções de redações no sistema"
        />
      )}

      {/* Modal de Detalhes da Correção */}
      <ModalDetalhesCorrecao
        idCorrecao={idCorrecaoDetalhes}
        aberto={Boolean(idCorrecaoDetalhes)}
        aoFechar={() => setIdCorrecaoDetalhes(null)}
      />
    </>
  );
}
