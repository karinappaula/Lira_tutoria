'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina, Spinner } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { cx } from '@/lib/cx';
import { formatarDataHora } from '@/lib/formatar';
import { indicadoresService } from '@/services/indicadores';
import type {
  AlunoRedacaoTutor,
  AlunoSimuladoTutor,
  IndicadoresAlunoGestaoResponse,
} from '@/types/indicadores';
import styles from './DesempenhoTutor.module.scss';

export function DesempenhoTutor() {
  const toast = useToast();
  const [abaAtiva, setAbaAtiva] = useState<'redacoes' | 'simulados'>('redacoes');

  // Query de Desempenho em Redações
  const {
    dados: dadosRedacoes,
    carregando: carregandoRedacoes,
    erro: erroRedacoes,
    recarregar: recarregarRedacoes,
  } = useBuscar((signal) => indicadoresService.obterDesempenhoRedacoesTutor(signal));

  // Query de Desempenho em Simulados
  const {
    dados: dadosSimulados,
    carregando: carregandoSimulados,
    erro: erroSimulados,
    recarregar: recarregarSimulados,
  } = useBuscar((signal) => indicadoresService.obterDesempenhoSimuladosTutor(signal));

  // Estado para Modal de Drill-Down do Aluno
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<number | null>(null);
  const [detalhesAluno, setDetalhesAluno] = useState<IndicadoresAlunoGestaoResponse | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  async function abrirDrillDown(idAluno: number) {
    setAlunoSelecionadoId(idAluno);
    setCarregandoDetalhes(true);
    try {
      const res = await indicadoresService.obterIndicadoresAlunoGestao(idAluno);
      setDetalhesAluno(res);
    } catch {
      toast.erro('Não foi possível carregar o histórico detalhado deste aluno.');
      setAlunoSelecionadoId(null);
    } finally {
      setCarregandoDetalhes(false);
    }
  }

  function fecharDrillDown() {
    setAlunoSelecionadoId(null);
    setDetalhesAluno(null);
  }

  const alunosRedacao = dadosRedacoes?.porAluno ?? [];
  const alunosSimulados = dadosSimulados?.porAluno ?? [];
  const rankingAssuntos = dadosSimulados?.rankingAssuntos ?? [];
  const competencias = dadosRedacoes?.mediaPorCompetencia ?? [];

  // Média Geral de Redações do grupo
  const mediaGeralNotas = useMemo(() => {
    const comNota = alunosRedacao.filter((a) => a.mediaNota !== null);
    if (!comNota.length) return null;
    const soma = comNota.reduce((acc, a) => acc + (a.mediaNota ?? 0), 0);
    return Math.round((soma / comNota.length) * 10) / 10;
  }, [alunosRedacao]);

  // Colunas de Redação
  const colunasRedacoes: Coluna<AlunoRedacaoTutor>[] = [
    {
      chave: 'nome',
      titulo: 'Aluno',
      celula: (a) => <strong>{a.nome}</strong>,
    },
    {
      chave: 'redacoesEnviadas',
      titulo: 'Enviadas',
      alinhamento: 'centro',
      celula: (a) => a.redacoesEnviadas,
    },
    {
      chave: 'pendentes',
      titulo: 'Pendentes',
      alinhamento: 'centro',
      celula: (a) =>
        a.pendentes > 0 ? (
          <Badge tom="alerta">{a.pendentes}</Badge>
        ) : (
          <Badge tom="sucesso">0</Badge>
        ),
    },
    {
      chave: 'aprovadas',
      titulo: 'Aprovadas / Liberadas',
      alinhamento: 'centro',
      celula: (a) => (
        <span className={styles.aprovadasDestaque}>{a.aprovadas}</span>
      ),
    },
    {
      chave: 'mediaNota',
      titulo: 'Média de Notas',
      alinhamento: 'centro',
      celula: (a) =>
        a.mediaNota !== null ? (
          <strong className={styles.notaDestaque}>{a.mediaNota} pts</strong>
        ) : (
          <span className={styles.textoSuave}>—</span>
        ),
    },
    {
      chave: 'ultimaNota',
      titulo: 'Última Nota',
      alinhamento: 'centro',
      celula: (a) =>
        a.ultimaNota !== null ? (
          <span>{a.ultimaNota} pts</span>
        ) : (
          <span className={styles.textoSuave}>—</span>
        ),
    },
    {
      chave: 'acoes',
      titulo: 'Evolução',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (a) => (
        <Button
          variante="secundario"
          tamanho="sm"
          icone={<Eye size={14} aria-hidden="true" />}
          onClick={() => void abrirDrillDown(a.idAluno)}
        >
          Ver Detalhes
        </Button>
      ),
    },
  ];

  // Colunas de Simulados
  const colunasSimulados: Coluna<AlunoSimuladoTutor>[] = [
    {
      chave: 'nome',
      titulo: 'Aluno',
      celula: (a) => <strong>{a.nome}</strong>,
    },
    {
      chave: 'realizados',
      titulo: 'Simulados Concluídos',
      alinhamento: 'centro',
      celula: (a) => a.realizados,
    },
    {
      chave: 'aproveitamentoGeral',
      titulo: 'Aproveitamento Geral',
      alinhamento: 'centro',
      celula: (a) =>
        a.realizados > 0 ? (
          <strong
            className={
              a.aproveitamentoGeral >= 70
                ? styles.aproveitamentoAlto
                : styles.aproveitamentoAlerta
            }
          >
            {a.aproveitamentoGeral}%
          </strong>
        ) : (
          <span className={styles.textoSuave}>Nenhum simulado</span>
        ),
    },
    {
      chave: 'acoes',
      titulo: 'Evolução',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (a) => (
        <Button
          variante="secundario"
          tamanho="sm"
          icone={<Eye size={14} aria-hidden="true" />}
          onClick={() => void abrirDrillDown(a.idAluno)}
        >
          Ver Detalhes
        </Button>
      ),
    },
  ];

  const carregando = carregandoRedacoes || carregandoSimulados;
  const erro = erroRedacoes || erroSimulados;

  return (
    <div className={styles.container}>
      <PageHeader
        titulo="Desempenho dos Tutorados"
        descricao="Acompanhe a evolução pedagógica, notas por competência e aproveitamento em simulados dos alunos sob sua tutoria."
      />

      {/* Grade de KPIs */}
      <div className={styles.gradeKpis}>
        <div className={styles.cartaoKpi}>
          <div className={styles.iconeKpi}>
            <FileText size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Redações Enviadas</span>
            <span className={styles.valorKpi}>{dadosRedacoes?.totais.enviadas ?? 0}</span>
          </div>
        </div>

        <div className={styles.cartaoKpi}>
          <div className={cx(styles.iconeKpi, styles.alerta)}>
            <Clock size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Aguardando Correção / Revisão</span>
            <span className={styles.valorKpi}>{dadosRedacoes?.totais.pendentes ?? 0}</span>
          </div>
        </div>

        <div className={styles.cartaoKpi}>
          <div className={cx(styles.iconeKpi, styles.sucesso)}>
            <CheckCircle2 size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Aprovadas / Liberadas</span>
            <span className={styles.valorKpi}>{dadosRedacoes?.totais.aprovadas ?? 0}</span>
          </div>
        </div>

        <div className={styles.cartaoKpi}>
          <div className={cx(styles.iconeKpi, styles.neutro)}>
            <Award size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Média Geral do Grupo</span>
            <span className={styles.valorKpi}>
              {mediaGeralNotas !== null ? `${mediaGeralNotas} pts` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Abas */}
      <div className={styles.barraAbas}>
        <button
          type="button"
          className={cx(styles.abaBotao, abaAtiva === 'redacoes' && styles.ativa)}
          onClick={() => setAbaAtiva('redacoes')}
        >
          <FileText size={16} aria-hidden="true" />
          Rendimento em Redações ({alunosRedacao.length})
        </button>
        <button
          type="button"
          className={cx(styles.abaBotao, abaAtiva === 'simulados' && styles.ativa)}
          onClick={() => setAbaAtiva('simulados')}
        >
          <GraduationCap size={16} aria-hidden="true" />
          Aproveitamento em Simulados ({alunosSimulados.length})
        </button>
      </div>

      {/* Conteúdo Principal */}
      {carregando ? (
        <CarregandoPagina rotulo="Carregando indicadores dos seus tutorados..." />
      ) : erro ? (
        <ErrorState
          mensagem={erro.message}
          aoTentarNovamente={() => {
            recarregarRedacoes();
            recarregarSimulados();
          }}
        />
      ) : abaAtiva === 'redacoes' ? (
        <div className={styles.painelConteudo}>
          {/* Gráfico de Barras Médias C1 a C5 do Grupo */}
          {competencias.length > 0 && (
            <section className={styles.cartaoSecao}>
              <div className={styles.cabecalhoSecao}>
                <div>
                  <h3>Médias do Grupo por Competência ENEM</h3>
                  <p>Notas médias (0 a 200 pontos) de todas as correções finalizadas dos seus tutorados</p>
                </div>
              </div>

              <div className={styles.gradeBarras}>
                {competencias.map((c) => {
                  const percentual = Math.min(100, Math.max(0, (c.media / 200) * 100));
                  return (
                    <div key={c.competencia} className={styles.itemBarra}>
                      <div className={styles.topoItemBarra}>
                        <span className={styles.nomeBarra}>
                          C{c.competencia}: {c.nome}
                        </span>
                        <span className={styles.valorBarra}>
                          {c.media} / 200 pts ({Math.round(percentual)}%)
                        </span>
                      </div>
                      <div className={styles.trilhaBarra}>
                        <div
                          className={styles.preenchimentoBarra}
                          style={{ '--largura': `${percentual}%` } as CSSProperties}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tabela de Redações por Aluno */}
          {alunosRedacao.length === 0 ? (
            <EmptyState
              titulo="Nenhum tutorado atribuído"
              descricao="Você ainda não possui alunos vinculados à sua tutoria."
            />
          ) : (
            <div className={styles.tabelaContainer}>
              <Tabela<AlunoRedacaoTutor>
                colunas={colunasRedacoes}
                linhas={alunosRedacao}
                chaveDaLinha={(a) => a.idAluno}
                descricao="Tabela de acompanhamento de redações dos tutorados"
              />
            </div>
          )}
        </div>
      ) : (
        <div className={styles.painelConteudo}>
          {/* Tópicos com Maior Índice de Erros */}
          {rankingAssuntos.length > 0 && (
            <section className={styles.cartaoSecao}>
              <div className={styles.cabecalhoSecao}>
                <div>
                  <h3>Tópicos com Maior Índice de Dificuldade</h3>
                  <p>Assuntos com menor taxa de acerto nos simulados realizados pelos seus alunos</p>
                </div>
              </div>

              <div className={styles.gradeBarras}>
                {rankingAssuntos.slice(0, 5).map((a) => {
                  const taxaErro = Math.max(0, 100 - a.percentual);
                  return (
                    <div key={a.idAssunto} className={styles.itemBarra}>
                      <div className={styles.topoItemBarra}>
                        <span className={styles.nomeBarra}>{a.nomeAssunto}</span>
                        <span className={cx(styles.valorBarra, styles.valorPerigo)}>
                          {a.percentual}% de acerto ({a.acertos}/{a.total})
                        </span>
                      </div>
                      <div className={styles.trilhaBarra}>
                        <div
                          className={cx(styles.preenchimentoBarra, styles.perigo)}
                          style={{ '--largura': `${taxaErro}%` } as CSSProperties}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tabela de Simulados por Aluno */}
          {alunosSimulados.length === 0 ? (
            <EmptyState
              titulo="Sem dados de simulados"
              descricao="Seus tutorados ainda não concluíram nenhum simulado."
            />
          ) : (
            <div className={styles.tabelaContainer}>
              <Tabela<AlunoSimuladoTutor>
                colunas={colunasSimulados}
                linhas={alunosSimulados}
                chaveDaLinha={(a) => a.idAluno}
                descricao="Tabela de aproveitamento em simulados dos tutorados"
              />
            </div>
          )}
        </div>
      )}

      {/* Modal Drill-Down de Evolução Individual do Aluno */}
      <Modal
        aberto={Boolean(alunoSelecionadoId)}
        aoFechar={fecharDrillDown}
        titulo={`Histórico Individual: ${detalhesAluno?.aluno.nome ?? 'Carregando...'}`}
        rodape={
          <Button variante="secundario" onClick={fecharDrillDown}>
            Fechar
          </Button>
        }
      >
        {carregandoDetalhes ? (
          <div className={styles.carregandoModal}>
            <Spinner rotulo="Carregando evolução do estudante..." />
          </div>
        ) : detalhesAluno ? (
          <div className={styles.conteudoDrillDown}>
            <div className={styles.resumoAlunoModal}>
              <div>
                <strong>Turma: {detalhesAluno.aluno.turma?.nome ?? 'Sem turma'}</strong>
                <span className={styles.subDado}>
                  {detalhesAluno.redacoes.corrigidas} redação(ões) corrigida(s) | Média:{' '}
                  {detalhesAluno.redacoes.mediaNotaTotal} pts
                </span>
              </div>
              <Badge tom="sucesso">
                {detalhesAluno.simulados.realizados} Simulado(s) |{' '}
                {detalhesAluno.simulados.aproveitamentoGeral}%
              </Badge>
            </div>

            <div>
              <h4 className={styles.tituloSecaoModal}>
                Evolução Temporal das Redações
              </h4>
              {detalhesAluno.redacoes.evolucao.length === 0 ? (
                <p className={styles.vazioModal}>
                  Nenhuma redação avaliada ainda.
                </p>
              ) : (
                <div className={styles.evolucaoLista}>
                  {detalhesAluno.redacoes.evolucao.map((ponto) => (
                    <div key={ponto.ordem} className={styles.cardEvolucaoItem}>
                      <div>
                        <strong>Redação #{ponto.ordem}</strong>
                        <span className={styles.subDadoPequeno}>
                          Versão {ponto.numeroVersao} | {formatarDataHora(ponto.data)}
                        </span>
                      </div>
                      <div className={styles.colunaDireitaModal}>
                        <strong className={styles.notaModal}>
                          {ponto.notaTotal} pts
                        </strong>
                        <span className={styles.subDadoMicro}>
                          C1:{ponto.c1} C2:{ponto.c2} C3:{ponto.c3} C4:{ponto.c4} C5:{ponto.c5}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
