'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Clock,
  Pause,
  Play,
  Send,
  Tag,
} from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { cx } from '@/lib/cx';
import { mensagemDeErro } from '@/lib/erros';
import { formatarTempoSegundos } from '@/lib/formatar';
import { RenderizadorQuestao } from '@/components/questoes/RenderizadorQuestao';
import { simuladosService } from '@/services/simulados';
import type { ItemQuestaoSimulado, ResultadoSimulado, SimuladoExecucao } from '@/types/simulados';
import styles from './ExecucaoSimulado.module.scss';

interface Props {
  simuladoInicial: SimuladoExecucao;
  aoVoltar: () => void;
  aoFinalizar: (resultado: ResultadoSimulado) => void;
}

function tomDificuldade(dif: string): TomDoBadge {
  switch (dif?.toUpperCase()) {
    case 'FACIL':
      return 'sucesso';
    case 'MEDIA':
      return 'alerta';
    case 'DIFICIL':
      return 'perigo';
    default:
      return 'neutro';
  }
}

export function ExecucaoSimulado({ simuladoInicial, aoVoltar, aoFinalizar }: Props) {
  const toast = useToast();

  const [simulado, setSimulado] = useState<SimuladoExecucao>(simuladoInicial);
  const [indiceAtual, setIndiceAtual] = useState(0);

  // Mapa de respostas: idQuestao -> letra
  const [respostas, setRespostas] = useState<Record<number, string>>(() => {
    const mapa: Record<number, string> = {};
    simuladoInicial.questoes.forEach((item) => {
      if (item.respostaAluno) mapa[item.idQuestao] = item.respostaAluno;
    });
    return mapa;
  });

  // Estado de salvamento
  const [salvandoResposta, setSalvandoResposta] = useState(false);
  const [statusSalvo, setStatusSalvo] = useState(false);

  // Cronômetro em tempo real
  const [tempoSegundos, setTempoSegundos] = useState<number>(
    simuladoInicial.cronometro?.tempoDecorridoSeg ?? 0,
  );
  const estaEmAndamento = simulado.statusSimulado === 'EM_ANDAMENTO';

  useEffect(() => {
    if (!estaEmAndamento) return;

    const intervalo = setInterval(() => {
      setTempoSegundos((atual) => atual + 1);
    }, 1000);

    return () => clearInterval(intervalo);
  }, [estaEmAndamento]);

  // Ações de Pausar e Retomar
  const [alterandoPausa, setAlterandoPausa] = useState(false);

  async function handlePausar() {
    setAlterandoPausa(true);
    try {
      const atualizado = await simuladosService.pausar(simulado.id);
      setSimulado(atualizado);
      setTempoSegundos(atualizado.cronometro.tempoDecorridoSeg);
      toast.sucesso('Simulado pausado. O tempo parou de contar.');
    } catch (err) {
      toast.erro(mensagemDeErro(err));
    } finally {
      setAlterandoPausa(false);
    }
  }

  async function handleRetomar() {
    setAlterandoPausa(true);
    try {
      const atualizado = await simuladosService.iniciar(simulado.id);
      setSimulado(atualizado);
      setTempoSegundos(atualizado.cronometro.tempoDecorridoSeg);
      toast.sucesso('Simulado retomado!');
    } catch (err) {
      toast.erro(mensagemDeErro(err));
    } finally {
      setAlterandoPausa(false);
    }
  }

  // Questão Atual
  const questoes = simulado.questoes;
  const questaoItem: ItemQuestaoSimulado | undefined = questoes[indiceAtual];
  const questao = questaoItem?.questao;

  // Selecionar resposta
  const handleSelecionarAlternativa = useCallback(
    async (letra: string) => {
      if (!questao || !estaEmAndamento) return;

      const letraMaiuscula = letra.toUpperCase();
      // Atualização otimista
      setRespostas((prev) => ({ ...prev, [questao.id]: letraMaiuscula }));
      setSalvandoResposta(true);
      setStatusSalvo(false);

      try {
        await simuladosService.responder(simulado.id, questao.id, letraMaiuscula);
        setStatusSalvo(true);
        setTimeout(() => setStatusSalvo(false), 2000);
      } catch (err) {
        toast.erro(mensagemDeErro(err));
      } finally {
        setSalvandoResposta(false);
      }
    },
    [questao, estaEmAndamento, simulado.id, toast],
  );

  // Atalhos de teclado (A, B, C, D, E)
  useEffect(() => {
    function tratarKeyDown(e: KeyboardEvent) {
      // Ignora se estiver digitando em campos de texto
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const tecla = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(tecla)) {
        e.preventDefault();
        void handleSelecionarAlternativa(tecla);
      } else if (e.key === 'ArrowRight' && indiceAtual < questoes.length - 1) {
        setIndiceAtual((i) => i + 1);
      } else if (e.key === 'ArrowLeft' && indiceAtual > 0) {
        setIndiceAtual((i) => i - 1);
      }
    }

    window.addEventListener('keydown', tratarKeyDown);
    return () => window.removeEventListener('keydown', tratarKeyDown);
  }, [handleSelecionarAlternativa, indiceAtual, questoes.length]);

  // Contadores de progresso
  const totalQuestoes = questoes.length;
  const totalRespondidas = Object.keys(respostas).length;
  const totalEmBranco = Math.max(0, totalQuestoes - totalRespondidas);
  const percentualRespondido = totalQuestoes > 0 ? Math.round((totalRespondidas / totalQuestoes) * 100) : 0;

  // Modal de Entrega
  const [modalEntregarAberto, setModalEntregarAberto] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  async function handleConfirmarEntrega() {
    setFinalizando(true);
    try {
      const resultado = await simuladosService.finalizar(simulado.id);
      toast.sucesso('Simulado entregue e pontuação calculada!');
      setModalEntregarAberto(false);
      aoFinalizar(resultado);
    } catch (err) {
      toast.erro(mensagemDeErro(err));
      setFinalizando(false);
    }
  }

  if (!questao) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p>Carregando simulado...</p>
        <Button onClick={aoVoltar} variante="secundario" style={{ marginTop: '16px' }}>
          Voltar para a lista
        </Button>
      </div>
    );
  }

  const respostaSelecionada = respostas[questao.id];

  return (
    <div className={styles.execucaoWrapper}>
      {/* 1. Barra Superior Fixa */}
      <header className={styles.barraSuperior}>
        <div className={styles.blocoIdentificacao}>
          <Button
            variante="texto"
            tamanho="sm"
            icone={<ArrowLeft size={16} aria-hidden="true" />}
            onClick={aoVoltar}
            title="Sair do modo de prova e voltar à listagem"
          >
            Sair
          </Button>
          <span className={styles.tituloSimulado}>
            Simulado #{simulado.id} {simulado.tipoSimulado === 'CADERNO_ERROS' ? '(Revisão)' : ''}
          </span>
        </div>

        {/* Cronômetro */}
        <div className={styles.blocoCronometro}>
          <div className={cx(styles.displayTempo, !estaEmAndamento && styles.pausado)}>
            <Clock size={18} aria-hidden="true" />
            <span>{formatarTempoSegundos(tempoSegundos)}</span>
          </div>

          {estaEmAndamento ? (
            <Button
              variante="secundario"
              tamanho="sm"
              icone={<Pause size={14} aria-hidden="true" />}
              carregando={alterandoPausa}
              onClick={() => void handlePausar()}
              title="Pausar simulado e congelar o tempo"
            >
              Pausar
            </Button>
          ) : (
            <Button
              variante="primario"
              tamanho="sm"
              icone={<Play size={14} aria-hidden="true" />}
              carregando={alterandoPausa}
              onClick={() => void handleRetomar()}
              title="Retomar simulado e continuar contando o tempo"
            >
              Retomar
            </Button>
          )}
        </div>

        {/* Progresso Geral */}
        <div className={styles.blocoProgresso}>
          <div className={styles.textoProgresso}>
            <span>Progresso da Prova</span>
            <span>
              {totalRespondidas}/{totalQuestoes} ({percentualRespondido}%)
            </span>
          </div>
          <div className={styles.trilhoProgresso}>
            <div className={styles.barraProgresso} style={{ width: `${percentualRespondido}%` }} />
          </div>
        </div>

        {/* Botão de Entrega */}
        <div className={styles.acoesBarraSuperior}>
          <Button
            variante="primario"
            icone={<Send size={16} aria-hidden="true" />}
            onClick={() => setModalEntregarAberto(true)}
          >
            Entregar Simulado
          </Button>
        </div>
      </header>

      {/* Aviso se estiver pausado */}
      {!estaEmAndamento && (
        <Alerta tom="alerta">
          O simulado está pausado. O cronômetro não está contando. Clique em <strong>&quot;Retomar&quot;</strong> para
          continuar respondendo as questões.
        </Alerta>
      )}

      {/* 2. Navegador de Questões (Pills) */}
      <nav className={styles.navegadorPills} aria-label="Navegação rápida entre questões">
        {questoes.map((item, idx) => {
          const respondida = Boolean(respostas[item.idQuestao]);
          const atual = idx === indiceAtual;

          return (
            <button
              key={item.idQuestao}
              type="button"
              className={cx(styles.pillQuestao, respondida && styles.respondida, atual && styles.atual)}
              onClick={() => setIndiceAtual(idx)}
              title={`Ir para questão ${idx + 1} (${respondida ? 'Respondida' : 'Em branco'})`}
            >
              {idx + 1}
            </button>
          );
        })}
      </nav>

      {/* 3. Cartão Central da Questão */}
      <main className={styles.cartaoQuestao}>
        <div className={styles.cabecalhoQuestao}>
          <div className={styles.metadadosQuestao}>
            <strong style={{ fontSize: '1.1rem', color: '#17292d' }}>
              Questão {indiceAtual + 1} de {totalQuestoes}
            </strong>
            <Badge tom="sucesso">{questao.vestibular}</Badge>
            <Badge tom="neutro">{questao.ano}</Badge>
            {questao.numeroQuestao && <Badge tom="neutro">#{questao.numeroQuestao}</Badge>}
            <Badge tom={tomDificuldade(questao.grauDificuldade)}>{questao.grauDificuldade}</Badge>
            {questao.assuntos?.map((v, i) => {
              const nome = 'assunto' in v && v.assunto ? v.assunto.nomeAssunto : ('nomeAssunto' in v ? String(v.nomeAssunto) : '');
              return (
                <span
                  key={i}
                  style={{
                    fontSize: '0.78rem',
                    background: '#eaf0ef',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    color: '#17292d',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Tag size={10} aria-hidden="true" />
                  {nome}
                </span>
              );
            })}
          </div>

          <div className={styles.statusSalvando}>
            {salvandoResposta ? (
              <>
                <Spinner tamanho="sm" rotulo="Salvando resposta..." />
                <span>Salvando...</span>
              </>
            ) : statusSalvo ? (
              <>
                <Check size={14} color="#006b70" aria-hidden="true" />
                <span style={{ color: '#006b70' }}>Resposta salva</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Enunciado Formatado com Markdown, Texto Base e [IMAGEM] In-line */}
        <RenderizadorQuestao conteudo={questao.enunciado} imagemUrl={questao.imagemUrl} />

        {/* Alternativas */}
        <div className={styles.gradeAlternativas}>
          {questao.alternativas.map((alt) => {
            const selecionada = respostaSelecionada === alt.letraOpcao;

            return (
              <button
                key={alt.letraOpcao}
                type="button"
                className={cx(styles.botaoAlternativa, selecionada && styles.selecionada)}
                disabled={!estaEmAndamento}
                onClick={() => void handleSelecionarAlternativa(alt.letraOpcao)}
              >
                <div className={styles.letraCirculo}>{alt.letraOpcao}</div>
                <div className={styles.textoAlternativa}>{alt.textoAlternativa}</div>
                {selecionada && (
                  <CheckCircle size={20} color="#006b70" style={{ alignSelf: 'center', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Atalho de Teclado Dica */}
        <p style={{ fontSize: '0.78rem', color: '#6b7d80', textAlign: 'center', marginTop: '8px' }}>
          Dica: Pressione as teclas <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, <strong>D</strong> ou{' '}
          <strong>E</strong> no teclado para marcar rapidamente a alternativa.
        </p>
      </main>

      {/* 4. Barra Inferior de Navegação */}
      <footer className={styles.barraInferiorNavegacao}>
        <Button
          variante="secundario"
          icone={<ArrowLeft size={16} aria-hidden="true" />}
          disabled={indiceAtual === 0}
          onClick={() => setIndiceAtual((i) => Math.max(0, i - 1))}
        >
          Questão Anterior
        </Button>

        {indiceAtual < totalQuestoes - 1 ? (
          <Button
            variante="secundario"
            icone={<ArrowRight size={16} aria-hidden="true" />}
            onClick={() => setIndiceAtual((i) => Math.min(totalQuestoes - 1, i + 1))}
          >
            Próxima Questão
          </Button>
        ) : (
          <Button
            variante="primario"
            icone={<Send size={16} aria-hidden="true" />}
            onClick={() => setModalEntregarAberto(true)}
          >
            Revisar e Entregar
          </Button>
        )}
      </footer>

      {/* Modal de Confirmação de Entrega */}
      <Modal
        aberto={modalEntregarAberto}
        aoFechar={() => setModalEntregarAberto(false)}
        titulo="Confirmar Entrega do Simulado"
        tamanho="md"
        rodape={
          <>
            <Button
              variante="secundario"
              onClick={() => setModalEntregarAberto(false)}
              disabled={finalizando}
            >
              Continuar Respondendo
            </Button>
            <Button
              variante="primario"
              carregando={finalizando}
              icone={<Send size={16} aria-hidden="true" />}
              onClick={() => void handleConfirmarEntrega()}
            >
              Confirmar e Entregar
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {totalEmBranco > 0 ? (
            <Alerta tom="alerta">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <div>
                  <strong>Atenção: você possui {totalEmBranco} questão(ões) em branco!</strong>
                  <p style={{ marginTop: '4px', fontSize: '0.88rem' }}>
                    Você respondeu {totalRespondidas} de {totalQuestoes} questões. Questões não respondidas não
                    pontuarão.
                  </p>
                </div>
              </div>
            </Alerta>
          ) : (
            <Alerta tom="sucesso">
              <strong>Parabéns! Todas as {totalQuestoes} questões foram respondidas.</strong>
              <p style={{ marginTop: '4px', fontSize: '0.88rem' }}>
                Pronto para enviar o simulado e consultar seu gabarito comentado imediatamente?
              </p>
            </Alerta>
          )}

          <p style={{ fontSize: '0.9rem', color: '#17292d' }}>
            Tempo total decorrido até agora: <strong>{formatarTempoSegundos(tempoSegundos)}</strong>. Ao confirmar, a
            avaliação será encerrada e a sua nota será calculada pelo servidor.
          </p>
        </div>
      </Modal>
    </div>
  );
}
