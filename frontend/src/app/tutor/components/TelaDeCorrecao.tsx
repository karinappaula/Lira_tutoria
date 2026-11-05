'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Send, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TextoMarcado, type SelecaoDeTrecho } from '@/components/redacao/TextoMarcado';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Card } from '@/components/ui/Card/Card';
import { Input, Select } from '@/components/ui/Campos/Campos';
import { ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { numero, sobrepoe, ultimaCorrecao, type MarcaVisual } from '@/lib/correcoes';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { tituloDaRedacao } from '@/lib/redacoes';
import { CATEGORIAS_MARCACAO, COMPETENCIAS, LIMITE_SUGESTAO, LIMITE_TEXTO, LIMITE_TRECHO, NIVEIS, type Nivel } from '@/lib/rubrica';
import { redacoesService } from '@/services/redacoes';
import { avisarFilaMudou, tutorService } from '@/services/tutor';
import type { NovaCorrecao, RedacaoDetalhada, VersaoComCorrecoes } from '@/types/correcoes';
import { CompetenciaCard } from './CompetenciaCard';
import styles from './TelaDeCorrecao.module.scss';

interface MarcaEditavel {
  chave: number;
  inicio: number;
  fim: number;
  tipoErro: string;
  sugestao: string;
}

type Niveis = Array<Nivel | null>;

const comoNivel = (valor: number): Nivel | null => ((NIVEIS as readonly number[]).includes(valor) ? (valor as Nivel) : null);

export function TelaDeCorrecao({ id }: { id: number }) {
  const { dados, carregando, erro, recarregar } = useBuscar((signal) => redacoesService.obter(id, signal), id);
  const voltar = (
    <Link href="/tutor/fila" className={styles.voltar}>
      <ArrowLeft size={16} aria-hidden="true" /> Fila de correção
    </Link>
  );

  if (carregando) return <CarregandoPagina rotulo="Carregando a redação" />;
  if (erro || !dados) {
    return (
      <>
        {voltar}
        <ErrorState mensagem={erro?.message ?? 'Não foi possível abrir a redação.'} conexao={erro?.ehErroDeConexao} aoTentarNovamente={recarregar} />
      </>
    );
  }

  const versao = dados.versoes[dados.versoes.length - 1];
  const corrigivel = versao && (versao.statusVersao === 'ENVIADA' || versao.statusVersao === 'AJUSTE_SOLICITADO');
  if (!versao || !corrigivel) {
    return (
      <>
        {voltar}
        <Alerta tom="info">Esta redação não está disponível para correção agora. Ela pode já ter sido corrigida ou estar em revisão.</Alerta>
        <p className={styles.espaco}>
          <Link href={`/tutor/redacoes/${dados.id}`}>Ver a redação e o histórico</Link>
        </p>
      </>
    );
  }

  return (
    <>
      {voltar}
      <FormularioDeCorrecao redacao={dados} versao={versao} />
    </>
  );
}

function FormularioDeCorrecao({ redacao, versao }: { redacao: RedacaoDetalhada; versao: VersaoComCorrecoes }) {
  const router = useRouter();
  const toast = useToast();
  const anterior = ultimaCorrecao(versao); // em "Corrigir novamente", parte da correção anterior
  const ehAvaliativa = redacao.tipoFluxo === 'AVALIATIVA';
  const texto = versao.conteudoTexto;

  const [niveis, setNiveis] = useState<Niveis>(() =>
    anterior
      ? [anterior.notaComp1, anterior.notaComp2, anterior.notaComp3, anterior.notaComp4, anterior.notaComp5].map((n) => comoNivel(numero(n)))
      : [null, null, null, null, null],
  );
  const [comentarios, setComentarios] = useState<string[]>(() =>
    anterior
      ? [anterior.comentarioComp1, anterior.comentarioComp2, anterior.comentarioComp3, anterior.comentarioComp4, anterior.comentarioComp5].map((c) => c ?? '')
      : ['', '', '', '', ''],
  );
  const [parecer, setParecer] = useState(anterior?.parecerGeral ?? '');
  const [recado, setRecado] = useState(anterior?.recadoAdmin ?? '');
  const [recomendarReescrita, setRecomendarReescrita] = useState(false);

  const [marcas, setMarcas] = useState<MarcaEditavel[]>(() =>
    (anterior?.anotacoes ?? []).map((a) => ({
      chave: a.id,
      inicio: a.posicaoInicio,
      fim: a.posicaoFinal,
      tipoErro: a.tipoErro,
      sugestao: a.sugestaoComentario ?? '',
    })),
  );

  const [selecao, setSelecao] = useState<SelecaoDeTrecho | null>(null);
  const [tipo, setTipo] = useState('');
  const [tipoCustomizado, setTipoCustomizado] = useState('');
  const [sugestao, setSugestao] = useState('');
  const [erroMarca, setErroMarca] = useState<string | null>(null);
  const [marcaAtiva, setMarcaAtiva] = useState<number | null>(null);
  const proximaChave = useRef(-1);

  const [errosNivel, setErrosNivel] = useState<Array<string | undefined>>([]);
  const [errosComentario, setErrosComentario] = useState<Array<string | undefined>>([]);
  const [avisoGeral, setAvisoGeral] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const [confirmandoReescrita, setConfirmandoReescrita] = useState(false);
  const [enviandoReescrita, setEnviandoReescrita] = useState(false);
  const [erroReescrita, setErroReescrita] = useState<string | null>(null);

  const topoRef = useRef<HTMLDivElement>(null);

  const aoSelecionar = useCallback((s: SelecaoDeTrecho) => {
    if (typeof window !== 'undefined') {
      const sel = window.getSelection();
      if (!sel || sel.toString().trim().length === 0) return;
    }
    setSelecao(s);
    setErroMarca(null);
  }, []);

  const marcasVisuais = useMemo<MarcaVisual[]>(
    () => marcas.map((m) => ({ chave: m.chave, inicio: m.inicio, fim: m.fim, tipoErro: m.tipoErro, sugestao: m.sugestao })),
    [marcas],
  );
  const parcial = niveis.reduce<number>((total, n) => total + (n ?? 0), 0);
  const faltam = niveis.filter((n) => n === null).length;

  const temNotasC1aC5 = niveis.every((n) => n !== null);
  const temOrientacao =
    parecer.trim().length > 0 ||
    marcas.length > 0 ||
    comentarios.some((c) => c.trim().length > 0);
  const podeSolicitarReescrita = temNotasC1aC5 && temOrientacao;

  function abrirModalReescrita() {
    if (!podeSolicitarReescrita) {
      setAvisoGeral('Para solicitar uma reescrita, preencha as notas das 5 competências e insira ao menos um parecer ou comentário orientativo.');
      topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setAvisoGeral(null);
    setErroReescrita(null);
    setConfirmandoReescrita(true);
  }

  function adicionarMarca() {
    if (!selecao) return;
    const tipoFinal = tipo === 'Outro...' ? tipoCustomizado.trim() : tipo;
    if (!tipoFinal) return setErroMarca(tipo === 'Outro...' ? 'Digite o nome da categoria personalizada.' : 'Escolha a categoria do desvio.');
    if (marcas.some((m) => sobrepoe(m, selecao))) return setErroMarca('Esse trecho já tem uma marcação. Selecione outro trecho ou remova a existente.');
    if (selecao.fim - selecao.inicio > LIMITE_TRECHO) return setErroMarca(`Selecione um trecho menor (até ${LIMITE_TRECHO} caracteres).`);
    const nova: MarcaEditavel = { chave: proximaChave.current--, inicio: selecao.inicio, fim: selecao.fim, tipoErro: tipoFinal, sugestao: sugestao.trim() };
    setMarcas((atuais) => [...atuais, nova].sort((a, b) => a.inicio - b.inicio));
    cancelarSelecao();
  }

  function cancelarSelecao() {
    setSelecao(null);
    setTipo('');
    setTipoCustomizado('');
    setSugestao('');
    setErroMarca(null);
    window.getSelection()?.removeAllRanges();
  }

  function validar(): boolean {
    const eN = niveis.map((n, i) => (n === null ? `Escolha o nível da competência ${i + 1}.` : undefined));
    const eC = comentarios.map((c, i) => (c.trim() === '' ? `Escreva a justificativa da competência ${i + 1}.` : undefined));
    setErrosNivel(eN);
    setErrosComentario(eC);
    const ok = !eN.some(Boolean) && !eC.some(Boolean);
    setAvisoGeral(ok ? null : 'Faltam campos obrigatórios: escolha o nível e escreva a justificativa em todas as 5 competências.');
    if (!ok) topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return ok;
  }

  async function enviar() {
    setEnviando(true);
    setErroEnvio(null);
    const n = niveis.map((x) => x ?? 0);
    const c = comentarios.map((x) => x.trim());
    const dados: NovaCorrecao = {
      idVersao: versao.id,
      notaComp1: n[0] ?? 0,
      notaComp2: n[1] ?? 0,
      notaComp3: n[2] ?? 0,
      notaComp4: n[3] ?? 0,
      notaComp5: n[4] ?? 0,
      comentarioComp1: c[0] ?? '',
      comentarioComp2: c[1] ?? '',
      comentarioComp3: c[2] ?? '',
      comentarioComp4: c[3] ?? '',
      comentarioComp5: c[4] ?? '',
      ...(parecer.trim() ? { parecerGeral: parecer.trim() } : {}),
      ...(ehAvaliativa && recado.trim() ? { recadoAdmin: recado.trim() } : {}),
      solicitarReescrita: ehAvaliativa ? recomendarReescrita : false,
      anotacoes: marcas.map((m) => ({
        posicaoInicio: m.inicio,
        posicaoFinal: m.fim,
        textoSelecionado: texto.slice(m.inicio, m.fim), // sempre o trecho exato do texto guardado
        tipoErro: m.tipoErro,
        ...(m.sugestao ? { sugestaoComentario: m.sugestao } : {}),
      })),
    };
    try {
      await tutorService.corrigir(dados);
      avisarFilaMudou();
      if (ehAvaliativa) {
        if (recomendarReescrita) {
          toast.sucesso('Correção e recomendação de reescrita enviadas para aprovação da Administração!');
        } else {
          toast.sucesso('Correção enviada para aprovação da Administração!');
        }
      } else {
        toast.sucesso('Correção liberada para o aluno.');
      }
      router.replace('/tutor/fila');
    } catch (e) {
      setErroEnvio(e instanceof ApiError ? e.message : mensagemDeErro(e));
      setEnviando(false);
    }
  }

  async function solicitarReescritaPelaCorrecao() {
    if (!podeSolicitarReescrita) {
      setAvisoGeral('Para solicitar uma reescrita, preencha as notas das 5 competências e insira ao menos um parecer ou comentário orientativo.');
      setConfirmandoReescrita(false);
      topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setEnviandoReescrita(true);
    setErroReescrita(null);
    try {
      const n = niveis.map((x) => x ?? 0);
      const c = comentarios.map((x) => x.trim());
      // Salva a avaliação com as notas e apontamentos antes de solicitar a reescrita
      await tutorService.corrigir({
        idVersao: versao.id,
        notaComp1: n[0] ?? 0,
        notaComp2: n[1] ?? 0,
        notaComp3: n[2] ?? 0,
        notaComp4: n[3] ?? 0,
        notaComp5: n[4] ?? 0,
        comentarioComp1: c[0] ?? '',
        comentarioComp2: c[1] ?? '',
        comentarioComp3: c[2] ?? '',
        comentarioComp4: c[3] ?? '',
        comentarioComp5: c[4] ?? '',
        ...(parecer.trim() ? { parecerGeral: parecer.trim() } : {}),
        ...(ehAvaliativa && recado.trim() ? { recadoAdmin: recado.trim() } : {}),
        anotacoes: marcas.map((m) => ({
          posicaoInicio: m.inicio,
          posicaoFinal: m.fim,
          textoSelecionado: texto.slice(m.inicio, m.fim),
          tipoErro: m.tipoErro,
          ...(m.sugestao ? { sugestaoComentario: m.sugestao } : {}),
        })),
      });

      await tutorService.solicitarReescrita(redacao.id);
      avisarFilaMudou();
      toast.sucesso('Reescrita solicitada com sucesso! O envio foi reaberto para o aluno.');
      setConfirmandoReescrita(false);
      router.replace('/tutor/fila');
    } catch (e) {
      setErroReescrita(e instanceof ApiError ? e.message : mensagemDeErro(e));
      setEnviandoReescrita(false);
    }
  }

  return (
    <>
      <PageHeader
        titulo={`Corrigir: ${tituloDaRedacao(redacao)}`}
        descricao={`${redacao.aluno?.usuario.nome ?? 'Aluno'} · ${versao.numeroVersao === 2 ? 'Reescrita' : 'Versão 1'} · ${ehAvaliativa ? 'Redação avaliativa' : 'Redação de treino'}`}
      />

      <div ref={topoRef} className={styles.avisos}>
        {avisoGeral && <Alerta tom="erro">{avisoGeral}</Alerta>}
        {anterior?.comentarioAjusteAdmin && (
          <Alerta tom="info">
            <strong>A Administração pediu ajuste:</strong> {anterior.comentarioAjusteAdmin}
          </Alerta>
        )}
        <Alerta tom="info">
          {ehAvaliativa
            ? 'Esta correção será enviada para a aprovação da Administração antes de aparecer para o aluno.'
            : 'Redação de treino: a correção é liberada direto para o aluno, sem passar pela Administração.'}
        </Alerta>
      </div>

      <div className={styles.layout}>
        <div className={styles.textoColuna}>
          <Card titulo="Texto do aluno">
            <p className={styles.instrucao}>Selecione um trecho com o mouse para marcar um erro e escrever a sugestão.</p>
            <div className={styles.containerTextoAluno} onClick={() => setMarcaAtiva(null)}>
              <TextoMarcado
                texto={texto}
                marcas={marcasVisuais}
                marcaAtiva={marcaAtiva}
                aoClicarMarca={(m) => {
                  const chave = Number(m.chave);
                  setMarcaAtiva((a) => (a === chave ? null : chave));
                }}
                aoExcluirMarca={(m) => {
                  setMarcas((a) => a.filter((x) => x.chave !== m.chave));
                  if (marcaAtiva === m.chave) setMarcaAtiva(null);
                }}
                aoSelecionar={aoSelecionar}
                selecaoPendente={selecao}
                rotulo="Texto da redação do aluno"
              />
            </div>
          </Card>

          {selecao && (
            <div className={styles.miniModalOverlay} onClick={cancelarSelecao}>
              <div className={styles.miniModal} role="dialog" aria-modal="true" aria-labelledby="titulo-mini-modal" onClick={(e) => e.stopPropagation()}>
                <div className={styles.miniModalCabecalho}>
                  <h3 id="titulo-mini-modal" className={styles.miniModalTitulo}>Nova marcação no texto</h3>
                  <button type="button" className={styles.miniModalBotaoFechar} onClick={cancelarSelecao} aria-label="Cancelar">
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <div className={styles.miniModalCorpo}>
                  <p className={styles.trecho}>“{texto.slice(selecao.inicio, selecao.fim)}”</p>
                  <Select rotulo="Categoria / Tipo de Erro" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    <option value="">Escolha a categoria</option>
                    {CATEGORIAS_MARCACAO.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="Outro...">Outro...</option>
                  </Select>
                  {tipo === 'Outro...' && (
                    <Input
                      rotulo="Categoria personalizada"
                      placeholder="Ex: Vocabulário, Sintaxe, Pontuação..."
                      value={tipoCustomizado}
                      onChange={(e) => setTipoCustomizado(e.target.value)}
                      maxLength={60}
                      autoFocus
                    />
                  )}
                  <label className={styles.rotuloSugestao} htmlFor="sugestao-marca">Sugestão / Explicação</label>
                  <textarea id="sugestao-marca" className={styles.sugestao} value={sugestao} onChange={(e) => setSugestao(e.target.value)} maxLength={LIMITE_SUGESTAO} rows={3} placeholder="Escreva a sugestão ou explicação pedagógica..." />
                  {erroMarca && <p className={styles.erro} role="alert">{erroMarca}</p>}
                </div>
                <div className={styles.miniModalRodape}>
                  <Button variante="secundario" onClick={cancelarSelecao}>Cancelar</Button>
                  <Button onClick={adicionarMarca}>Confirmar</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.fichaColuna}>
          {COMPETENCIAS.map((comp, i) => (
            <CompetenciaCard
              key={comp.numero}
              competencia={comp}
              nivel={niveis[i] ?? null}
              aoEscolherNivel={(n) => {
                setNiveis((a) => a.map((x, j) => (j === i ? n : x)));
                setErrosNivel((a) => a.map((x, j) => (j === i ? undefined : x)));
              }}
              comentario={comentarios[i] ?? ''}
              aoMudarComentario={(t) => {
                setComentarios((a) => a.map((x, j) => (j === i ? t : x)));
                setErrosComentario((a) => a.map((x, j) => (j === i ? undefined : x)));
              }}
              erroNivel={errosNivel[i]}
              erroComentario={errosComentario[i]}
            />
          ))}

          <Card titulo="Parecer geral (opcional)">
            <textarea className={styles.sugestao} value={parecer} onChange={(e) => setParecer(e.target.value)} maxLength={LIMITE_TEXTO} rows={4} aria-label="Parecer geral" placeholder="Visão geral do texto e orientações para o aluno." />
            <p className={styles.contador}>
              {parecer.length}/{LIMITE_TEXTO}
            </p>
          </Card>

          {ehAvaliativa && (
            <Card titulo="Recado para o Admin (opcional)">
              <textarea
                className={styles.sugestao}
                value={recado}
                onChange={(e) => setRecado(e.target.value)}
                maxLength={LIMITE_TEXTO}
                rows={3}
                aria-label="Recado para o Admin"
                placeholder="Mensagem ou observação direcionada à administração do sistema."
              />
              <p className={styles.contador}>
                {recado.length}/{LIMITE_TEXTO}
              </p>
            </Card>
          )}
        </div>
      </div>

      <div className={styles.barraFixa}>
        <p className={styles.parcial}>
          Nota parcial: <strong>{parcial}</strong>/1000
          {faltam > 0 && <span> · faltam {faltam} {faltam === 1 ? 'competência' : 'competências'}</span>}
        </p>
        <div className={styles.botoesBarraFixa}>
          {ehAvaliativa ? (
            <>
              {versao.numeroVersao === 1 && (
                <label className={styles.checkboxReescrita}>
                  <input
                    type="checkbox"
                    checked={recomendarReescrita}
                    onChange={(e) => setRecomendarReescrita(e.target.checked)}
                    disabled={enviando}
                  />
                  <span>Recomendar que o aluno faça uma Reescrita</span>
                </label>
              )}
              <Button
                icone={<Send size={16} aria-hidden="true" />}
                onClick={() => validar() && setConfirmando(true)}
                disabled={enviando}
              >
                Enviar Correção
              </Button>
            </>
          ) : (
            <>
              {versao.numeroVersao === 1 && (
                <Button
                  variante="secundario"
                  icone={<RotateCcw size={16} aria-hidden="true" />}
                  onClick={abrirModalReescrita}
                  disabled={enviando || enviandoReescrita}
                  title={
                    !podeSolicitarReescrita
                      ? 'Para solicitar uma reescrita, preencha as notas das 5 competências e insira ao menos um parecer ou comentário orientativo.'
                      : undefined
                  }
                >
                  Solicitar Reescrita
                </Button>
              )}
              <Button
                icone={<Send size={16} aria-hidden="true" />}
                onClick={() => validar() && setConfirmando(true)}
                disabled={enviando || enviandoReescrita}
              >
                Enviar Correção
              </Button>
            </>
          )}
        </div>
      </div>

      <Modal
        aberto={confirmando}
        aoFechar={() => {
          setConfirmando(false);
          setErroEnvio(null);
        }}
        titulo="Enviar a correção?"
        rodape={
          <>
            <Button variante="secundario" disabled={enviando} onClick={() => setConfirmando(false)}>
              Voltar e revisar
            </Button>
            <Button carregando={enviando} onClick={() => void enviar()}>
              Enviar agora
            </Button>
          </>
        }
      >
        <div className={styles.resumo}>
          {erroEnvio && <Alerta tom="erro">{erroEnvio}</Alerta>}
          <ul className={styles.notas}>
            {niveis.map((n, i) => (
              <li key={i}>
                <span>C{i + 1}</span>
                <strong>{n ?? '—'}/200</strong>
              </li>
            ))}
          </ul>
          <p className={styles.total}>
            Nota final: <strong>{parcial}/1000</strong>
          </p>
          <p>
            {ehAvaliativa
              ? recomendarReescrita
                ? 'Ela seguirá para a revisão da Administração com recomendação de reescrita.'
                : 'Ela seguirá para a revisão da Administração.'
              : 'Ela será liberada para o aluno imediatamente.'}
          </p>
        </div>
      </Modal>

      <Modal
        aberto={confirmandoReescrita}
        aoFechar={() => {
          if (!enviandoReescrita) {
            setConfirmandoReescrita(false);
            setErroReescrita(null);
          }
        }}
        titulo="Solicitar reescrita ao aluno?"
        rodape={
          <>
            <Button variante="secundario" disabled={enviandoReescrita} onClick={() => setConfirmandoReescrita(false)}>
              Cancelar
            </Button>
            <Button
              icone={<RotateCcw size={16} aria-hidden="true" />}
              carregando={enviandoReescrita}
              onClick={() => void solicitarReescritaPelaCorrecao()}
            >
              Confirmar solicitação
            </Button>
          </>
        }
      >
        <div className={styles.resumo}>
          {erroReescrita && <Alerta tom="erro">{erroReescrita}</Alerta>}
          <p>
            Ao confirmar, o status da redação será alterado para <strong>'Reescrita solicitada'</strong> e o envio será reaberto para o aluno.
          </p>
          <p className={styles.instrucaoModal}>
            O aluno receberá a notificação de reescrita e poderá redigir a <strong>Reescrita</strong> (com validação obrigatória de 8 a 30 linhas), consultando suas marcações e feedback no painel dele.
          </p>
        </div>
      </Modal>
    </>
  );
}
