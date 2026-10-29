'use client';

import Link from 'next/link';
import {
  AlertCircle,
  BarChart2,
  BookOpen,
  CheckCircle2,
  Clock,
  Notebook,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { cx } from '@/lib/cx';
import { formatarTempoSegundos } from '@/lib/formatar';
import { RenderizadorQuestao } from '@/components/questoes/RenderizadorQuestao';
import type { ResultadoSimulado } from '@/types/simulados';
import styles from './ResultadoSimuladoModal.module.scss';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  resultado: ResultadoSimulado | null;
}

export function ResultadoSimuladoModal({ aberto, aoFechar, resultado }: Props) {
  if (!resultado) return null;

  const { resumo, desempenhoPorAssunto, itens, tempoGastoSeg, idSimulado, tipoSimulado } = resultado;

  const percentualAcerto = resumo.percentual;
  const tomResultado: TomDoBadge =
    percentualAcerto >= 70 ? 'sucesso' : percentualAcerto >= 50 ? 'alerta' : 'perigo';

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Resultado do Simulado #${idSimulado} ${tipoSimulado === 'CADERNO_ERROS' ? '(Revisão de Erros)' : ''}`}
      tamanho="xl"
      rodape={
        <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {resumo.erros > 0 ? (
            <Link href="/aluno/caderno-erros" onClick={aoFechar}>
              <Button variante="secundario" icone={<Notebook size={16} aria-hidden="true" />}>
                Ver no Caderno de Erros ({resumo.erros} {resumo.erros === 1 ? 'questão' : 'questões'})
              </Button>
            </Link>
          ) : (
            <div />
          )}
          <Button variante="primario" onClick={aoFechar}>
            Concluir e Fechar
          </Button>
        </div>
      }
    >
      <div className={styles.container}>
        {/* Grade de Estatísticas Gerais */}
        <div className={styles.gradeStats}>
          <div className={cx(styles.cartaoStat, styles[tomResultado])}>
            <span className={styles.valorStat}>
              <Trophy size={20} style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
              {percentualAcerto}%
            </span>
            <span className={styles.rotuloStat}>
              {resumo.acertos} de {resumo.total} acertos
            </span>
          </div>

          <div className={cx(styles.cartaoStat, resumo.erros > 0 ? styles.perigo : styles.sucesso)}>
            <span className={styles.valorStat}>
              <XCircle size={20} style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
              {resumo.erros}
            </span>
            <span className={styles.rotuloStat}>Questões Erradas</span>
          </div>

          <div className={styles.cartaoStat}>
            <span className={styles.valorStat}>
              <AlertCircle size={20} style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
              {resumo.emBranco}
            </span>
            <span className={styles.rotuloStat}>Em Branco</span>
          </div>

          <div className={styles.cartaoStat}>
            <span className={styles.valorStat}>
              <Clock size={20} style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
              {formatarTempoSegundos(tempoGastoSeg)}
            </span>
            <span className={styles.rotuloStat}>Tempo Total Gasto</span>
          </div>
        </div>

        {/* Desempenho por Tópico / Assunto */}
        {desempenhoPorAssunto && desempenhoPorAssunto.length > 0 && (
          <section className={styles.secao}>
            <div className={styles.secaoTitulo}>
              <BarChart2 size={18} color="#006b70" aria-hidden="true" />
              <span>Desempenho por Assunto</span>
            </div>
            <div className={styles.gradeAssuntos}>
              {desempenhoPorAssunto.map((assunto) => {
                const classeBarra =
                  assunto.percentual >= 70 ? '' : assunto.percentual >= 50 ? styles.medio : styles.baixo;
                return (
                  <div key={assunto.idAssunto} className={styles.itemAssunto}>
                    <div className={styles.linhaTopoAssunto}>
                      <span>{assunto.nomeAssunto}</span>
                      <span>
                        <strong>{assunto.acertos}/{assunto.total}</strong> ({assunto.percentual}%)
                      </span>
                    </div>
                    <div className={styles.barraTrilho}>
                      <div
                        className={cx(styles.barraPreenchimento, classeBarra)}
                        style={{ width: `${Math.min(100, Math.max(0, assunto.percentual))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Gabarito Detalhado e Resolução Comentada */}
        <section className={styles.secao}>
          <div className={styles.secaoTitulo}>
            <BookOpen size={18} color="#006b70" aria-hidden="true" />
            <span>Gabarito Comentado Questão por Questão</span>
          </div>

          <div className={styles.listaQuestoesGabarito}>
            {itens.map((item) => {
              const statusClasse = item.acertou ? styles.acertou : !item.respondida ? styles.emBranco : styles.errou;

              return (
                <div key={item.idQuestao} className={cx(styles.cardQuestaoGabarito, statusClasse)}>
                  <div className={styles.topoQuestaoGabarito}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem', color: '#17292d' }}>Questão {item.ordem}</strong>
                      <Badge tom="neutro">{item.vestibular} {item.ano}</Badge>
                      {item.numeroQuestao && <Badge tom="neutro">#{item.numeroQuestao}</Badge>}
                      {item.assuntos?.map((assunto) => (
                        <span
                          key={assunto.id}
                          style={{
                            fontSize: '0.75rem',
                            background: '#eaf0ef',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            color: '#17292d',
                          }}
                        >
                          {assunto.nomeAssunto}
                        </span>
                      ))}
                    </div>

                    <div>
                      {item.acertou ? (
                        <Badge tom="sucesso">
                          <CheckCircle2 size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                          Acertou (+1 ponto)
                        </Badge>
                      ) : !item.respondida ? (
                        <Badge tom="neutro">
                          <AlertCircle size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                          Em Branco
                        </Badge>
                      ) : (
                        <Badge tom="perigo">
                          <XCircle size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                          Errou (Sua resposta: {item.respostaAluno})
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Enunciado Formatado com Markdown, Texto Base e [IMAGEM] In-line */}
                  <RenderizadorQuestao conteudo={item.enunciado} imagemUrl={item.imagemUrl} />

                  {/* Alternativas */}
                  <div className={styles.listaAlternativasGabarito}>
                    {item.alternativas.map((alt) => {
                      const ehGabaritoCorreto = alt.letraOpcao === item.respostaCorreta;
                      const foiMarcadaPeloAluno = alt.letraOpcao === item.respostaAluno;
                      const foiErro = foiMarcadaPeloAluno && !ehGabaritoCorreto;

                      return (
                        <div
                          key={alt.letraOpcao}
                          className={cx(
                            styles.itemAltGabarito,
                            ehGabaritoCorreto && styles.correta,
                            foiErro && styles.marcadaIncorreta,
                          )}
                        >
                          <span className={styles.letraAlt}>{alt.letraOpcao}</span>
                          <span style={{ flex: 1 }}>{alt.textoAlternativa}</span>
                          {ehGabaritoCorreto && <span>(Gabarito Oficial)</span>}
                          {foiMarcadaPeloAluno && !ehGabaritoCorreto && <span>(Sua Resposta)</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explicação pedagógica se houver */}
                  {item.explicacaoGabarito && (
                    <div className={styles.caixaExplicacao}>
                      <strong>Resolução Comentada:</strong>
                      {item.explicacaoGabarito}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Modal>
  );
}
