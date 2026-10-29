'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Select } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useBuscar } from '@/hooks/useBuscar';
import { cx } from '@/lib/cx';
import { indicadoresService } from '@/services/indicadores';
import type { DesempenhoTurmaItem, DesempenhoTutorItem } from '@/types/indicadores';
import styles from './DesempenhoAdmin.module.scss';

function tomFaixa(faixa: string | null): TomDoBadge {
  switch (faixa) {
    case 'ALTO':
      return 'sucesso';
    case 'MEDIO':
      return 'alerta';
    case 'BAIXO':
      return 'perigo';
    default:
      return 'neutro';
  }
}

export function DesempenhoAdmin() {
  const [abaAtiva, setAbaAtiva] = useState<'turmas' | 'tutores'>('turmas');
  const [filtroTurma, setFiltroTurma] = useState<string>('TODAS');

  const {
    dados: turmas,
    carregando: carregandoTurmas,
    erro: erroTurmas,
    recarregar: recarregarTurmas,
  } = useBuscar((signal) => indicadoresService.obterDesempenhoTurmas(undefined, signal));

  const {
    dados: tutores,
    carregando: carregandoTutores,
    erro: erroTutores,
    recarregar: recarregarTutores,
  } = useBuscar((signal) => indicadoresService.obterDesempenhoTutores(signal));

  const listaTurmas = turmas ?? [];
  const listaTutores = tutores ?? [];

  // Turma selecionada para detalhe de competências
  const turmaSelecionada = useMemo(() => {
    if (filtroTurma === 'TODAS') return null;
    return listaTurmas.find((t) => t.idTurma === Number(filtroTurma)) ?? null;
  }, [listaTurmas, filtroTurma]);

  // Lista de turmas filtradas para a tabela
  const turmasExibidas = useMemo(() => {
    if (filtroTurma === 'TODAS') return listaTurmas;
    return listaTurmas.filter((t) => t.idTurma === Number(filtroTurma));
  }, [listaTurmas, filtroTurma]);

  // KPIs consolidados
  const totalAlunos = useMemo(() => {
    return listaTurmas.reduce((acc, t) => acc + t.alunos, 0);
  }, [listaTurmas]);

  const mediaGeralRedacoes = useMemo(() => {
    const comNota = listaTurmas.filter((t) => t.redacoes.mediaNota !== null);
    if (!comNota.length) return null;
    const soma = comNota.reduce((acc, t) => acc + (t.redacoes.mediaNota ?? 0), 0);
    return Math.round((soma / comNota.length) * 10) / 10;
  }, [listaTurmas]);

  const mediaGeralSimulados = useMemo(() => {
    const comSimulado = listaTurmas.filter((t) => t.simulados.aplicados > 0);
    if (!comSimulado.length) return null;
    const soma = comSimulado.reduce((acc, t) => acc + t.simulados.aproveitamento, 0);
    return Math.round((soma / comSimulado.length) * 10) / 10;
  }, [listaTurmas]);

  // Competências médias consolidadas (ou da turma selecionada)
  const competenciasConsolidadas = useMemo(() => {
    if (turmaSelecionada) {
      return turmaSelecionada.redacoes.mediaPorCompetencia;
    }
    // Consolida entre todas as turmas que possuem notas
    const mapa = new Map<number, { nome: string; soma: number; count: number }>();
    for (const t of listaTurmas) {
      for (const c of t.redacoes.mediaPorCompetencia) {
        if (!mapa.has(c.competencia)) {
          mapa.set(c.competencia, { nome: c.nome, soma: 0, count: 0 });
        }
        const item = mapa.get(c.competencia)!;
        item.soma += c.media;
        item.count += 1;
      }
    }
    return Array.from(mapa.entries()).map(([competencia, data]) => ({
      competencia,
      nome: data.nome,
      media: data.count > 0 ? Math.round((data.soma / data.count) * 10) / 10 : 0,
    }));
  }, [listaTurmas, turmaSelecionada]);

  const competenciaCritica = useMemo(() => {
    if (turmaSelecionada?.redacoes.competenciaMaisFraca) {
      return turmaSelecionada.redacoes.competenciaMaisFraca;
    }
    if (!competenciasConsolidadas.length) return null;
    return [...competenciasConsolidadas].sort((a, b) => a.media - b.media)[0];
  }, [turmaSelecionada, competenciasConsolidadas]);

  // Colunas da Tabela de Turmas
  const colunasTurmas: Coluna<DesempenhoTurmaItem>[] = [
    {
      chave: 'turma',
      titulo: 'Turma',
      celula: (t) => (
        <div>
          <strong>{t.nome}</strong>
          <span className={styles.subDado}>
            Ano Letivo: {t.anoLetivo}
          </span>
        </div>
      ),
    },
    {
      chave: 'alunos',
      titulo: 'Alunos',
      alinhamento: 'centro',
      celula: (t) => t.alunos,
    },
    {
      chave: 'tutores',
      titulo: 'Tutores',
      alinhamento: 'centro',
      celula: (t) => t.tutores,
    },
    {
      chave: 'redacoes',
      titulo: 'Média Redações',
      alinhamento: 'centro',
      celula: (t) =>
        t.redacoes.mediaNota !== null ? (
          <strong className={styles.destaquePrimario}>{t.redacoes.mediaNota} pts</strong>
        ) : (
          <span className={styles.textoSuave}>—</span>
        ),
    },
    {
      chave: 'competenciaCritica',
      titulo: 'Ponto de Atenção',
      celula: (t) =>
        t.redacoes.competenciaMaisFraca ? (
          <Badge tom="alerta">
            C{t.redacoes.competenciaMaisFraca.competencia} ({t.redacoes.competenciaMaisFraca.media} pts)
          </Badge>
        ) : (
          <span className={styles.textoSuave}>—</span>
        ),
    },
    {
      chave: 'simulados',
      titulo: 'Simulados',
      alinhamento: 'centro',
      celula: (t) =>
        t.simulados.aplicados > 0 ? (
          <div>
            <span>{t.simulados.aproveitamento}%</span>
            <span className={styles.subDadoPequeno}>
              ({t.simulados.aplicados} concluídos)
            </span>
          </div>
        ) : (
          <span className={styles.textoSuave}>Sem simulados</span>
        ),
    },
    {
      chave: 'faixa',
      titulo: 'Rendimento',
      alinhamento: 'centro',
      celula: (t) =>
        t.simulados.faixa ? (
          <Badge tom={tomFaixa(t.simulados.faixa)}>{t.simulados.faixa}</Badge>
        ) : (
          <Badge tom="neutro">Indefinido</Badge>
        ),
    },
  ];

  // Colunas da Tabela de Tutores
  const colunasTutores: Coluna<DesempenhoTutorItem>[] = [
    {
      chave: 'tutor',
      titulo: 'Tutor',
      celula: (tut) => (
        <div>
          <strong>{tut.nome}</strong>
          <span className={styles.subDado}>
            Turma: {tut.turma.nome}
          </span>
        </div>
      ),
    },
    {
      chave: 'tutorados',
      titulo: 'Tutorados Ativos',
      alinhamento: 'centro',
      celula: (tut) => tut.tutorados,
    },
    {
      chave: 'correcoes',
      titulo: 'Total Correções',
      alinhamento: 'centro',
      celula: (tut) => (
        <span className={styles.valorNegrito}>{tut.correcoesRealizadas}</span>
      ),
    },
    {
      chave: 'aguardando',
      titulo: 'Aguardando Aprovação',
      alinhamento: 'centro',
      celula: (tut) =>
        tut.aguardandoAprovacao > 0 ? (
          <Badge tom="alerta">{tut.aguardandoAprovacao}</Badge>
        ) : (
          <Badge tom="sucesso">0</Badge>
        ),
    },
    {
      chave: 'ajustes',
      titulo: 'Ajustes Solicitados',
      alinhamento: 'centro',
      celula: (tut) =>
        tut.ajustesSolicitados > 0 ? (
          <Badge tom="perigo">{tut.ajustesSolicitados}</Badge>
        ) : (
          <Badge tom="neutro">0</Badge>
        ),
    },
    {
      chave: 'mediaGrupo',
      titulo: 'Média do Grupo',
      alinhamento: 'centro',
      celula: (tut) =>
        tut.mediaNotaGrupo !== null ? (
          <strong className={styles.destaquePrimario}>{tut.mediaNotaGrupo} pts</strong>
        ) : (
          <span className={styles.textoSuave}>—</span>
        ),
    },
  ];

  const carregando = carregandoTurmas || carregandoTutores;
  const erro = erroTurmas || erroTutores;

  return (
    <div className={styles.container}>
      <PageHeader
        titulo="Indicadores Institucionais"
        descricao="Acompanhe o rendimento pedagógico consolidado por turmas, competências do ENEM e desempenho comparativo entre tutores."
      />

      {/* Grade de KPIs Institucionais */}
      <div className={styles.gradeKpis}>
        <div className={styles.cartaoKpi}>
          <div className={styles.iconeKpi}>
            <Users size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Alunos Ativos</span>
            <span className={styles.valorKpi}>{totalAlunos}</span>
          </div>
        </div>

        <div className={styles.cartaoKpi}>
          <div className={cx(styles.iconeKpi, styles.neutro)}>
            <GraduationCap size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Turmas / Tutores</span>
            <span className={styles.valorKpi}>
              {listaTurmas.length} / {listaTutores.length}
            </span>
          </div>
        </div>

        <div className={styles.cartaoKpi}>
          <div className={styles.iconeKpi}>
            <Award size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Média Geral Redações</span>
            <span className={styles.valorKpi}>
              {mediaGeralRedacoes !== null ? `${mediaGeralRedacoes} pts` : '—'}
            </span>
          </div>
        </div>

        <div className={styles.cartaoKpi}>
          <div className={cx(styles.iconeKpi, styles.alerta)}>
            <TrendingUp size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Aproveitamento Simulados</span>
            <span className={styles.valorKpi}>
              {mediaGeralSimulados !== null ? `${mediaGeralSimulados}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Controles (Abas de Visão + Filtro de Turma) */}
      <div className={styles.barraControles}>
        <div className={styles.abas} role="tablist" aria-label="Visões do Dashboard">
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'turmas'}
            className={cx(styles.abaBotao, abaAtiva === 'turmas' && styles.ativa)}
            onClick={() => setAbaAtiva('turmas')}
          >
            <BookOpen size={16} aria-hidden="true" />
            Visão por Turma ({listaTurmas.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'tutores'}
            className={cx(styles.abaBotao, abaAtiva === 'tutores' && styles.ativa)}
            onClick={() => setAbaAtiva('tutores')}
          >
            <Users size={16} aria-hidden="true" />
            Visão por Tutor ({listaTutores.length})
          </button>
        </div>

        {abaAtiva === 'turmas' && (
          <div className={styles.filtroSelect}>
            <Select
              rotulo="Filtrar por Turma"
              value={filtroTurma}
              onChange={(e) => setFiltroTurma(e.target.value)}
            >
              <option value="TODAS">Todas as Turmas</option>
              {listaTurmas.map((t) => (
                <option key={t.idTurma} value={t.idTurma}>
                  {t.nome} ({t.anoLetivo})
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Conteúdo das Abas */}
      {carregando ? (
        <CarregandoPagina rotulo="Carregando indicadores institucionais..." />
      ) : erro ? (
        <ErrorState
          mensagem={erro.message}
          aoTentarNovamente={() => {
            recarregarTurmas();
            recarregarTutores();
          }}
        />
      ) : abaAtiva === 'turmas' ? (
        <div className={styles.painelConteudo}>
          {/* Gráfico de Barras por Competência ENEM C1 a C5 em SCSS Puro */}
          {competenciasConsolidadas.length > 0 && (
            <section className={styles.cartaoGrafico}>
              <div className={styles.cabecalhoGrafico}>
                <div>
                  <h3>Médias por Competência ENEM (0 a 200 pontos)</h3>
                  <p className={styles.subtituloGrafico}>
                    {turmaSelecionada
                      ? `Notas médias registradas na turma ${turmaSelecionada.nome}`
                      : 'Notas médias consolidadas em todas as turmas ativas'}
                  </p>
                </div>

                {competenciaCritica && (
                  <Badge tom="alerta">
                    <AlertTriangle size={13} className={styles.iconeBadge} aria-hidden="true" />
                    Menor Média: C{competenciaCritica.competencia} ({competenciaCritica.media} pts)
                  </Badge>
                )}
              </div>

              <div className={styles.gradeBarras}>
                {competenciasConsolidadas.map((c) => {
                  const percentual = Math.min(100, Math.max(0, (c.media / 200) * 100));
                  const ehCritica = competenciaCritica?.competencia === c.competencia;

                  return (
                    <div key={c.competencia} className={styles.itemBarra}>
                      <div className={styles.topoItemBarra}>
                        <span className={styles.nomeCompetencia}>
                          C{c.competencia}: {c.nome}
                        </span>
                        <span className={styles.notaCompetencia}>
                          {c.media} / 200 pts ({Math.round(percentual)}%)
                        </span>
                      </div>
                      <div className={styles.trilhaBarra}>
                        <div
                          className={cx(styles.preenchimentoBarra, ehCritica && styles.fraca)}
                          style={{ '--largura': `${percentual}%` } as CSSProperties}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tabela de Turmas */}
          <div className={styles.tabelaContainer}>
            <Tabela<DesempenhoTurmaItem>
              colunas={colunasTurmas}
              linhas={turmasExibidas}
              chaveDaLinha={(t) => t.idTurma}
              descricao="Tabela comparativa de turmas com médias de redação e simulados"
            />
          </div>
        </div>
      ) : (
        <div className={styles.painelConteudo}>
          {/* Tabela de Tutores */}
          {listaTutores.length === 0 ? (
            <EmptyState
              titulo="Nenhum tutor cadastrado"
              descricao="Ainda não existem tutores ativos vinculados a turmas."
            />
          ) : (
            <div className={styles.tabelaContainer}>
              <Tabela<DesempenhoTutorItem>
                colunas={colunasTutores}
                linhas={listaTutores}
                chaveDaLinha={(tut) => tut.idTutor}
                descricao="Tabela de acompanhamento de tutores e fluxo de correções"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
