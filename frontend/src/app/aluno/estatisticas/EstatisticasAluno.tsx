'use client';

import { useMemo, type CSSProperties } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  FileText,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { useBuscar } from '@/hooks/useBuscar';
import { cx } from '@/lib/cx';
import { formatarDataHora } from '@/lib/formatar';
import { indicadoresService } from '@/services/indicadores';
import styles from './EstatisticasAluno.module.scss';

export function EstatisticasAluno() {
  const {
    dados,
    carregando,
    erro,
    recarregar,
  } = useBuscar((signal) => indicadoresService.obterIndicadoresAluno(signal));

  const redacoes = dados?.redacoes;
  const simulados = dados?.simulados;

  // Cálculo da variação
  const variacao = useMemo(() => {
    if (!redacoes?.variacaoUltimaNota) return null;
    const { anterior, atual } = redacoes.variacaoUltimaNota;
    const diff = atual - anterior;
    return diff;
  }, [redacoes?.variacaoUltimaNota]);

  // Pontos fortes e a melhorar nos simulados
  const { fortes, melhorar } = useMemo(() => {
    const lista = simulados?.desempenhoPorAssunto ?? [];
    const fortes = lista.filter((a) => a.percentual >= 70);
    const melhorar = lista.filter((a) => a.percentual < 70);
    return { fortes, melhorar };
  }, [simulados?.desempenhoPorAssunto]);

  if (carregando) {
    return <CarregandoPagina rotulo="Carregando suas estatísticas e evolução..." />;
  }

  if (erro) {
    return <ErrorState mensagem={erro.message} aoTentarNovamente={recarregar} />;
  }

  const temRedacoes = (redacoes?.corrigidas ?? 0) > 0;
  const temSimulados = (simulados?.realizados ?? 0) > 0;

  return (
    <div className={styles.container}>
      <PageHeader
        titulo="Minhas Estatísticas"
        descricao="Acompanhe sua evolução pedagógica, notas por competência do ENEM e taxa de acertos em simulados."
        
      />

      {/* Grade de KPIs */}
      <div className={styles.gradeKpis}>
        <div className={styles.cartaoKpi}>
          <div className={styles.iconeKpi}>
            <FileText size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Redações Avaliadas</span>
            <span className={styles.valorKpi}>{redacoes?.corrigidas ?? 0}</span>
          </div>
        </div>

        <div className={styles.cartaoKpi}>
          <div className={cx(styles.iconeKpi, styles.sucesso)}>
            <Award size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Média Geral Redações</span>
            <span className={styles.valorKpi}>
              {temRedacoes ? `${redacoes?.mediaNotaTotal} pts` : '—'}
            </span>
            {variacao !== null && (
              <span
                className={cx(
                  styles.subValorKpi,
                  variacao > 0
                    ? styles.positivo
                    : variacao < 0
                      ? styles.negativo
                      : styles.neutro,
                )}
              >
                {variacao > 0 ? `+${variacao} pts` : `${variacao} pts`} na última versão
              </span>
            )}
          </div>
        </div>

        <div className={styles.cartaoKpi}>
          <div className={cx(styles.iconeKpi, styles.neutro)}>
            <GraduationCap size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Simulados Concluídos</span>
            <span className={styles.valorKpi}>{simulados?.realizados ?? 0}</span>
          </div>
        </div>

        <div className={styles.cartaoKpi}>
          <div className={cx(styles.iconeKpi, styles.alerta)}>
            <TrendingUp size={24} aria-hidden="true" />
          </div>
          <div className={styles.textosKpi}>
            <span className={styles.rotuloKpi}>Aproveitamento Geral</span>
            <span className={styles.valorKpi}>
              {temSimulados ? `${simulados?.aproveitamentoGeral}%` : '—'}
            </span>
            <span className={styles.subValorKpi}>
              {simulados?.acertos ?? 0} de {simulados?.questoes ?? 0} questões acertadas
            </span>
          </div>
        </div>
      </div>

      {/* Grade Principal de Gráficos */}
      <div className={styles.gradeGraficos}>
        {/* Competências do ENEM */}
        <section className={styles.cartaoSecao}>
          <div className={styles.cabecalhoSecao}>
            <div>
              <h3>Médias por Competência ENEM</h3>
              <p>Desempenho médio (0 a 200 pontos) alcançado em cada competência oficial</p>
            </div>
          </div>

          {!temRedacoes ? (
            <EmptyState
              titulo="Sem avaliações de redação"
              descricao="Assim que suas redações forem corrigidas e liberadas pelo seu tutor, suas médias por competência aparecerão aqui."
            />
          ) : (
            <div className={styles.gradeBarras}>
              {redacoes?.mediaPorCompetencia.map((c) => {
                const percentual = Math.min(100, Math.max(0, (c.media / 200) * 100));
                const tomBarra =
                  percentual >= 75
                    ? styles.sucesso
                    : percentual >= 55
                      ? styles.alerta
                      : styles.perigo;

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
                        className={cx(styles.preenchimentoBarra, tomBarra)}
                        style={{ '--largura': `${percentual}%` } as CSSProperties}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Histórico Temporal de Redações */}
        <section className={styles.cartaoSecao}>
          <div className={styles.cabecalhoSecao}>
            <div>
              <h3>Evolução Temporal das Redações</h3>
              <p>Histórico de pontuação obtida em cada versão corrigida</p>
            </div>
          </div>

          {!temRedacoes ? (
            <EmptyState
              titulo="Nenhum histórico registrado"
              descricao="Envie suas redações para treino ou avaliação para acompanhar a evolução das suas notas."
            />
          ) : (
            <div className={styles.listaEvolucao}>
              {redacoes?.evolucao.map((ponto) => (
                <div key={ponto.ordem} className={styles.itemEvolucao}>
                  <div className={styles.infoEvolucao}>
                    <strong>
                      Redação #{ponto.ordem} ({ponto.tipoFluxo})
                    </strong>
                    <span>
                      Versão {ponto.numeroVersao} | {formatarDataHora(ponto.data)}
                    </span>
                  </div>
                  <div className={styles.notaEvolucao}>
                    <span className={styles.pontos}>{ponto.notaTotal} pts</span>
                    <span className={styles.competencias}>
                      C1:{ponto.c1} C2:{ponto.c2} C3:{ponto.c3} C4:{ponto.c4} C5:{ponto.c5}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Seção de Simulados por Assunto (Pontos Fortes e a Melhorar) */}
      <section className={styles.cartaoSecao}>
        <div className={styles.cabecalhoSecao}>
          <div>
            <h3>Diagnóstico em Simulados por Assunto</h3>
            <p>Mapeamento dos tópicos em que você se destaca e dos que requerem mais revisão</p>
          </div>
        </div>

        {!temSimulados ? (
          <EmptyState
            titulo="Nenhum simulado concluído ainda"
            descricao="Inicie e finalize simulados para mapear seus pontos fortes e fracos por matéria e assunto."
          />
        ) : (
          <div className={styles.colunasAssuntos}>
            {/* Pontos Fortes */}
            <div className={styles.blocoAssunto}>
              <div className={styles.tituloBlocoAssunto}>
                <CheckCircle2 size={18} className={styles.iconeSucesso} aria-hidden="true" />
                <span>Pontos Fortes (70%+ de acerto)</span>
              </div>
              {fortes.length === 0 ? (
                <p className={styles.textoVazio}>
                  Nenhum assunto atingiu 70% de acerto ainda. Continue praticando!
                </p>
              ) : (
                <div className={styles.gradeBarras}>
                  {fortes.map((a) => (
                    <div key={a.idAssunto} className={styles.itemBarra}>
                      <div className={styles.topoItemBarra}>
                        <span className={styles.nomeBarra}>{a.nomeAssunto}</span>
                        <span className={styles.valorBarra}>
                          {a.percentual}% ({a.acertos}/{a.total})
                        </span>
                      </div>
                      <div className={styles.trilhaBarra}>
                        <div
                          className={cx(styles.preenchimentoBarra, styles.sucesso)}
                          style={{ '--largura': `${a.percentual}%` } as CSSProperties}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pontos a Melhorar */}
            <div className={styles.blocoAssunto}>
              <div className={styles.tituloBlocoAssunto}>
                <AlertCircle size={18} className={styles.iconeAlerta} aria-hidden="true" />
                <span>Pontos a Aprimorar (&lt; 70% de acerto)</span>
              </div>
              {melhorar.length === 0 ? (
                <p className={styles.textoVazio}>
                  Excelente! Você está com alto rendimento em todos os assuntos testados.
                </p>
              ) : (
                <div className={styles.gradeBarras}>
                  {melhorar.map((a) => (
                    <div key={a.idAssunto} className={styles.itemBarra}>
                      <div className={styles.topoItemBarra}>
                        <span className={styles.nomeBarra}>{a.nomeAssunto}</span>
                        <span className={cx(styles.valorBarra, styles.valorAlerta)}>
                          {a.percentual}% ({a.acertos}/{a.total})
                        </span>
                      </div>
                      <div className={styles.trilhaBarra}>
                        <div
                          className={cx(styles.preenchimentoBarra, styles.alerta)}
                          style={{ '--largura': `${a.percentual}%` } as CSSProperties}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
