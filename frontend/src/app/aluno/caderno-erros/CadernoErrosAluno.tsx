'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Play,
  RotateCcw,
  Sparkles,
  Tag,
  X,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { RenderizadorQuestao } from '@/components/questoes/RenderizadorQuestao';
import { useBuscar } from '@/hooks/useBuscar';
import { cx } from '@/lib/cx';
import { formatarDataHora } from '@/lib/formatar';
import { questoesService } from '@/services/questoes';
import { simuladosService } from '@/services/simulados';
import type { ItemCadernoErros, ResultadoSimulado, SimuladoExecucao } from '@/types/simulados';
import { ExecucaoSimulado } from '../simulados/ExecucaoSimulado';
import { ResultadoSimuladoModal } from '../simulados/ResultadoSimuladoModal';
import styles from './CadernoErrosAluno.module.scss';

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

interface CardCadernoErroProps {
  item: ItemCadernoErros;
  estaSelecionado: boolean;
  aoToggleSelecionar: () => void;
  aoRefazer: (ids: number[]) => void;
  gerandoRevisao: boolean;
}

function CardCadernoErro({
  item,
  estaSelecionado,
  aoToggleSelecionar,
  aoRefazer,
  gerandoRevisao,
}: CardCadernoErroProps) {
  const toast = useToast();
  const [painelAberto, setPainelAberto] = useState(false);
  const [respostaMarcada, setRespostaMarcada] = useState<string | null>(null);
  const [estaConfirmado, setEstaConfirmado] = useState(false);

  const q = item.questao;
  const letraCorreta = q.alternativas.find((a) => a.alternativaCorreta)?.letraOpcao;
  const acertou = estaConfirmado && Boolean(letraCorreta) && respostaMarcada === letraCorreta;

  function togglePainel() {
    setPainelAberto((aberto) => !aberto);
  }

  function handleConfirmarResposta() {
    if (!respostaMarcada) {
      toast.info('Selecione uma alternativa antes de confirmar.');
      return;
    }

    setEstaConfirmado(true);
    setPainelAberto(true);

    if (letraCorreta && respostaMarcada === letraCorreta) {
      toast.sucesso(`🎉 Parabéns! Você acertou a questão #${q.id}!`);
    } else {
      toast.erro(
        `Resposta incorreta. Você marcou ${respostaMarcada}, mas a alternativa correta é ${letraCorreta || '—'}.`,
      );
    }
  }

  function handleResetarPratica() {
    setEstaConfirmado(false);
    setRespostaMarcada(null);
  }

  return (
    <article className={cx(styles.cardErro, estaSelecionado && styles.selecionado)}>
      {/* Topo do Card */}
      <div className={styles.topoCardErro}>
        <div className={styles.identificacaoQuestao}>
          <input
            type="checkbox"
            className={styles.checkboxSelecao}
            checked={estaSelecionado}
            onChange={aoToggleSelecionar}
            aria-label={`Selecionar questão #${q.id}`}
          />
          <Badge tom="sucesso">{q.vestibular}</Badge>
          <Badge tom="neutro">{q.ano}</Badge>
          {q.numeroQuestao && <Badge tom="neutro">#{q.numeroQuestao}</Badge>}
          <Badge tom={tomDificuldade(q.grauDificuldade)}>{q.grauDificuldade}</Badge>
          <Badge tom={item.quantidadeErros > 1 ? 'perigo' : 'alerta'}>
            {item.quantidadeErros === 1 ? 'Errou 1 vez' : `Errou ${item.quantidadeErros} vezes`}
          </Badge>
        </div>

        <div className={styles.listaAssuntosTag}>
          {q.assuntos?.map((v, idx) => {
            const nome =
              'assunto' in v && v.assunto
                ? v.assunto.nomeAssunto
                : 'nomeAssunto' in v
                  ? String(v.nomeAssunto)
                  : '';
            return (
              <span key={idx} className={styles.tagAssunto}>
                <Tag size={10} aria-hidden="true" />
                {nome}
              </span>
            );
          })}
        </div>
      </div>

      {/* Renderizador de Questão */}
      <RenderizadorQuestao conteudo={q.enunciado} imagemUrl={q.imagemUrl} />

      {/* Seção Prática: Refazer a questão diretamente no card */}
      <div className={styles.secaoRefazerPratica}>
        <div className={styles.tituloRefazer}>
          <span>Praticar Questão (Escolha sua resposta):</span>
          {estaConfirmado && (
            <div className={cx(styles.bannerResultadoPratica, acertou ? styles.acertou : styles.errou)}>
              {acertou ? (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>Você acertou!</span>
                </>
              ) : (
                <>
                  <XCircle size={16} aria-hidden="true" />
                  <span>
                    Incorreto! Sua: {respostaMarcada} | Gabarito: {letraCorreta || '—'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Alternativas Interativas */}
        <div className={styles.gradeAlternativasPratica}>
          {q.alternativas.map((alt) => {
            const ehMarcada = respostaMarcada === alt.letraOpcao;
            const ehCorreta = estaConfirmado && letraCorreta === alt.letraOpcao;
            const ehIncorreta = estaConfirmado && ehMarcada && !ehCorreta;

            return (
              <button
                key={alt.letraOpcao}
                type="button"
                className={cx(
                  styles.itemOpcaoPratica,
                  ehMarcada && styles.selecionada,
                  ehCorreta && styles.corretaConfirmada,
                  ehIncorreta && styles.incorretaConfirmada,
                )}
                disabled={estaConfirmado}
                onClick={() => {
                  if (!estaConfirmado) {
                    setRespostaMarcada(alt.letraOpcao);
                  }
                }}
              >
                <div className={styles.letraCirculoPratica}>
                  {ehCorreta ? <Check size={14} /> : ehIncorreta ? <X size={14} /> : alt.letraOpcao}
                </div>
                <span className={styles.textoOpcaoPratica}>{alt.textoAlternativa}</span>
              </button>
            );
          })}
        </div>

        {/* Barra de Ação de Prática */}
        <div className={styles.barraConfirmacaoPratica}>
          {!estaConfirmado ? (
            <Button
              variante="primario"
              tamanho="sm"
              icone={<Sparkles size={14} aria-hidden="true" />}
              disabled={!respostaMarcada}
              onClick={handleConfirmarResposta}
            >
              Confirmar Resposta
            </Button>
          ) : (
            <Button
              variante="secundario"
              tamanho="sm"
              icone={<RotateCcw size={14} aria-hidden="true" />}
              onClick={handleResetarPratica}
            >
              Tentar Novamente
            </Button>
          )}
        </div>
      </div>

      {/* Painel Retrátil (Accordion) de Gabarito e Resolução Comentada - OCULTO POR PADRÃO */}
      <div className={styles.painelAccordionGabarito}>
        <div>
          <Button
            variante="secundario"
            tamanho="sm"
            icone={
              painelAberto ? (
                <ChevronUp size={15} aria-hidden="true" />
              ) : (
                <ChevronDown size={15} aria-hidden="true" />
              )
            }
            onClick={togglePainel}
          >
            {painelAberto
              ? 'Ocultar Gabarito e Resolução Comentada'
              : 'Ver Gabarito e Resolução Comentada'}
          </Button>
        </div>

        {painelAberto && (
          <div className={styles.corpoAccordion}>
            <div className={styles.blocoGabaritoOficial}>
              <strong className={styles.rotuloGabaritoOficial}>
                Gabarito Oficial:
              </strong>
              <Badge tom="sucesso">
                <CheckCircle2 size={13} className={styles.iconeGabaritoOficial} />
                Alternativa {letraCorreta || '—'}
              </Badge>
            </div>

            {q.explicacaoGabarito && q.explicacaoGabarito.trim() ? (
              <div className={styles.blocoExplicacaoComentada}>
                <strong>Resolução Comentada e Justificativa Pedagógica:</strong>
                <p>{q.explicacaoGabarito}</p>
              </div>
            ) : (
              <p className={styles.textoSemExplicacao}>
                Esta questão ainda não possui resolução comentada cadastrada.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Rodapé do Card com Data do Último Erro e Ação para Simulado */}
      <div className={styles.rodapeCardErro}>
        <span className={styles.infoDataErro}>
          Último erro registrado em {formatarDataHora(item.dataUltimoErro)}
        </span>

        <div className={styles.acoesCardErro}>
          <Button
            variante="primario"
            tamanho="sm"
            icone={<Play size={14} aria-hidden="true" />}
            carregando={gerandoRevisao}
            onClick={() => aoRefazer([item.id])}
          >
            Refazer em Simulado
          </Button>
        </div>
      </div>
    </article>
  );
}

export function CadernoErrosAluno() {
  const toast = useToast();

  const [busca, setBusca] = useState('');
  const [filtroAssunto, setFiltroAssunto] = useState<string>('TODOS');
  const [selecionados, setSelecionados] = useState<number[]>([]);

  // Estado para execução de simulado de revisão
  const [gerandoRevisao, setGerandoRevisao] = useState(false);
  const [simuladoEmExecucao, setSimuladoEmExecucao] = useState<SimuladoExecucao | null>(null);
  const [resultadoAtual, setResultadoAtual] = useState<ResultadoSimulado | null>(null);
  const [modalResultadoAberto, setModalResultadoAberto] = useState(false);

  // Query: assuntos
  const { dados: assuntosRaw } = useBuscar((signal) => questoesService.listarAssuntos(signal));
  const assuntos = assuntosRaw ?? [];

  // Query: erros do aluno
  const idAssuntoFiltro = filtroAssunto !== 'TODOS' ? Number(filtroAssunto) : undefined;
  const {
    dados: errosRaw,
    carregando,
    erro,
    recarregar,
  } = useBuscar((signal) => simuladosService.listarCadernoErros(idAssuntoFiltro, signal), idAssuntoFiltro);
  const erros: ItemCadernoErros[] = errosRaw ?? [];

  // Filtro textual
  const itensFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return erros;

    return erros.filter((item) => {
      const q = item.questao;
      return (
        q.enunciado.toLowerCase().includes(termo) ||
        q.vestibular.toLowerCase().includes(termo) ||
        String(q.ano).includes(termo) ||
        q.assuntos?.some((a) =>
          ('assunto' in a && a.assunto?.nomeAssunto?.toLowerCase().includes(termo)) ||
          ('nomeAssunto' in a && String(a.nomeAssunto).toLowerCase().includes(termo)),
        )
      );
    });
  }, [erros, busca]);

  // Métricas
  const totalErros = erros.length;
  const maisDeUmErro = useMemo(() => erros.filter((e) => e.quantidadeErros > 1).length, [erros]);
  const topAssuntos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of erros) {
      for (const a of e.questao.assuntos || []) {
        const nome =
          'assunto' in a && a.assunto
            ? a.assunto.nomeAssunto
            : 'nomeAssunto' in a
              ? String(a.nomeAssunto)
              : '';
        if (nome) mapa.set(nome, (mapa.get(nome) ?? 0) + 1);
      }
    }
    return mapa.size;
  }, [erros]);

  function toggleSelecionar(idCaderno: number) {
    setSelecionados((prev) =>
      prev.includes(idCaderno) ? prev.filter((id) => id !== idCaderno) : [...prev, idCaderno],
    );
  }

  function selecionarTodos() {
    if (selecionados.length === itensFiltrados.length) {
      setSelecionados([]);
    } else {
      setSelecionados(itensFiltrados.map((item) => item.id));
    }
  }

  // Disparar Simulado de Revisão no Cronômetro
  async function handleRefazer(ids?: number[]) {
    setGerandoRevisao(true);
    try {
      const payload = {
        idsCaderno: ids && ids.length > 0 ? ids : undefined,
        idAssunto: idAssuntoFiltro,
      };
      let simExec = await simuladosService.refazerErros(payload);
      if (simExec.statusSimulado === 'CRIADO') {
        simExec = await simuladosService.iniciar(simExec.id);
      }
      toast.sucesso(`Simulado de revisão criado com ${simExec.questoes.length} questões!`);
      setSimuladoEmExecucao(simExec);
    } catch {
      toast.erro('Não foi possível gerar o simulado de revisão.');
    } finally {
      setGerandoRevisao(false);
    }
  }

  // Retorno condicional para tela cheia de simulação de revisão
  if (simuladoEmExecucao) {
    return (
      <ExecucaoSimulado
        simuladoInicial={simuladoEmExecucao}
        aoVoltar={() => {
          setSimuladoEmExecucao(null);
          recarregar();
        }}
        aoFinalizar={(resultado) => {
          setSimuladoEmExecucao(null);
          setResultadoAtual(resultado);
          setModalResultadoAberto(true);
          recarregar();
        }}
      />
    );
  }

  return (
    <>
      <PageHeader
        titulo="Caderno de Erros"
        descricao="Revise as questões que você errou em simulados anteriores. Teste seus conhecimentos diretamente no card ou gere um Simulado de Revisão cronometrado."
        acao={
          totalErros > 0 ? (
            <Button
              variante="primario"
              icone={<RotateCcw size={16} aria-hidden="true" />}
              carregando={gerandoRevisao}
              onClick={() => void handleRefazer()}
            >
              Refazer Todas em Simulado ({totalErros})
            </Button>
          ) : undefined
        }
      />

      {/* Grade de Métricas */}
      <div className={styles.gradeMetricas}>
        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <XCircle size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Questões para Revisar</span>
            <span className={styles.valorMetrica}>{totalErros}</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={cx(styles.iconeMetrica, styles.alerta)}>
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Erros Recorrentes (2+ vezes)</span>
            <span className={styles.valorMetrica}>{maisDeUmErro}</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={cx(styles.iconeMetrica, styles.primaria)}>
            <BookOpen size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Assuntos Mapeados</span>
            <span className={styles.valorMetrica}>{topAssuntos}</span>
          </div>
        </div>
      </div>

      {/* Banner de Explicação Pedagógica */}
      <div className={styles.bannerPedagogico}>
        <Info size={22} aria-hidden="true" />
        <p>
          <strong>Como funciona o Caderno de Erros?</strong> Você pode testar e refazer cada questão diretamente
          abaixo (o gabarito fica oculto até você confirmar) ou selecionar questões e clicar em{' '}
          <strong>&quot;Refazer em Simulado&quot;</strong>. Ao acertar uma questão em um simulado de revisão, ela é
          considerada superada e sai do seu caderno!
        </p>
      </div>

      {/* Barra de Filtros */}
      <section className={styles.barraFiltros}>
        <div className={styles.buscaTexto}>
          <Input
            rotulo="Buscar por texto"
            placeholder="Buscar por palavras no enunciado ou vestibular..."
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className={styles.filtroAssunto}>
          <Select
            rotulo="Filtrar por Assunto"
            value={filtroAssunto}
            onChange={(e) => setFiltroAssunto(e.target.value)}
          >
            <option value="TODOS">Todos os Assuntos</option>
            {assuntos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nomeAssunto}
              </option>
            ))}
          </Select>
        </div>
      </section>

      {/* Conteúdo Principal */}
      {carregando ? (
        <CarregandoPagina rotulo="Carregando itens do seu caderno de erros..." />
      ) : erro ? (
        <ErrorState mensagem={erro.message} aoTentarNovamente={recarregar} />
      ) : totalErros === 0 ? (
        <EmptyState
          titulo="Parabéns! Seu Caderno de Erros está vazio."
          descricao="Você não possui nenhuma questão pendente de revisão. Continue praticando simulados para testar seus conhecimentos!"
        />
      ) : (
        <>
          {/* Barra de Ações em Massa */}
          <div className={styles.barraMassa}>
            <div className={styles.contadorSelecao}>
              <input
                type="checkbox"
                className={styles.checkboxSelecao}
                checked={selecionados.length === itensFiltrados.length && itensFiltrados.length > 0}
                onChange={selecionarTodos}
                id="selecionar-todas"
              />
              <label htmlFor="selecionar-todas">
                {selecionados.length > 0
                  ? `${selecionados.length} de ${itensFiltrados.length} questões selecionadas`
                  : 'Selecionar todas as questões da lista'}
              </label>
            </div>

            <div className={styles.botoesMassa}>
              {selecionados.length > 0 && (
                <Button
                  variante="primario"
                  icone={<Play size={16} aria-hidden="true" />}
                  carregando={gerandoRevisao}
                  onClick={() => void handleRefazer(selecionados)}
                >
                  Refazer Selecionadas em Simulado ({selecionados.length})
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Questões com Erro */}
          <div className={styles.listaErros}>
            {itensFiltrados.map((item) => (
              <CardCadernoErro
                key={item.id}
                item={item}
                estaSelecionado={selecionados.includes(item.id)}
                aoToggleSelecionar={() => toggleSelecionar(item.id)}
                aoRefazer={(ids) => void handleRefazer(ids)}
                gerandoRevisao={gerandoRevisao}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal de Resultado (após terminar simulado de revisão) */}
      <ResultadoSimuladoModal
        aberto={modalResultadoAberto}
        aoFechar={() => setModalResultadoAberto(false)}
        resultado={resultadoAtual}
      />
    </>
  );
}
