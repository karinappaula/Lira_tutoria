'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TextoMarcado, type SelecaoDeTrecho } from '@/components/redacao/TextoMarcado';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Card } from '@/components/ui/Card/Card';
import { Select } from '@/components/ui/Campos/Campos';
import { ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { numero, sobrepoe, ultimaCorrecao, type MarcaVisual } from '@/lib/correcoes';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { tituloDaRedacao } from '@/lib/redacoes';
import { COMPETENCIAS, infoDoTipo, LIMITE_SUGESTAO, LIMITE_TEXTO, LIMITE_TRECHO, NIVEIS, TIPOS_DE_ERRO, type Nivel } from '@/lib/rubrica';
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

const comoNivel = (valor: number): Nivel | null => (NIVEIS as readonly number[]).includes(valor) ? (valor as Nivel) : null;

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
  const topoRef = useRef<HTMLDivElement>(null);

  const aoSelecionar = useCallback((s: SelecaoDeTrecho) => {
    setSelecao(s);
    setErroMarca(null);
  }, []);

  const marcasVisuais = useMemo<MarcaVisual[]>(() => marcas.map((m) => ({ chave: m.chave, inicio: m.inicio, fim: m.fim, tipoErro: m.tipoErro })), [marcas]);
  const evidencias = (numeroDaCompetencia: number) => marcas.filter((m) => infoDoTipo(m.tipoErro).competencia === numeroDaCompetencia).length;
  const parcial = niveis.reduce<number>((total, n) => total + (n ?? 0), 0);
  const faltam = niveis.filter((n) => n === null).length;

  function adicionarMarca() {
    if (!selecao) return;
    if (!tipo) return setErroMarca('Escolha o tipo de erro deste trecho.');
    if (marcas.some((m) => sobrepoe(m, selecao))) return setErroMarca('Esse trecho já tem uma marcação. Selecione outro trecho ou remova a existente.');
    if (selecao.fim - selecao.inicio > LIMITE_TRECHO) return setErroMarca(`Selecione um trecho menor (até ${LIMITE_TRECHO} caracteres).`);
    const nova: MarcaEditavel = { chave: proximaChave.current--, inicio: selecao.inicio, fim: selecao.fim, tipoErro: tipo, sugestao: sugestao.trim() };
    setMarcas((atuais) => [...atuais, nova].sort((a, b) => a.inicio - b.inicio));
    cancelarSelecao();
  }

  function cancelarSelecao() {
    setSelecao(null);
    setTipo('');
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
      toast.sucesso(ehAvaliativa ? 'Correção enviada para a revisão da Administração.' : 'Correção liberada para o aluno.');
      router.replace('/tutor/fila');
    } catch (e) {
      setErroEnvio(e instanceof ApiError ? e.message : mensagemDeErro(e));
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader
        titulo={`Corrigir: ${tituloDaRedacao(redacao)}`}
        descricao={`${redacao.aluno?.usuario.nome ?? 'Aluno'} · ${versao.numeroVersao === 2 ? 'Reescrita (versão 2)' : 'Versão 1'} · ${ehAvaliativa ? 'Redação avaliativa' : 'Redação de treino'}`}
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
            <p className={styles.instrucao}>Selecione um trecho com o mouse (ou com o dedo, no celular) para marcar um erro e escrever a sugestão.</p>
            <TextoMarcado
              texto={texto}
              marcas={marcasVisuais}
              marcaAtiva={marcaAtiva}
              aoClicarMarca={(m) => setMarcaAtiva((a) => (a === m.chave ? null : Number(m.chave)))}
              aoSelecionar={aoSelecionar}
              selecaoPendente={selecao}
              rotulo="Texto da redação do aluno"
            />
          </Card>

          {selecao && (
            <Card titulo="Marcar trecho selecionado" className={styles.painelMarca}>
              <p className={styles.trecho}>“{texto.slice(selecao.inicio, selecao.fim)}”</p>
              <Select rotulo="Tipo de erro" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Escolha o tipo</option>
                {TIPOS_DE_ERRO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.valor}
                    {t.competencia ? ` (C${t.competencia})` : ''}
                  </option>
                ))}
              </Select>
              <label className={styles.rotuloSugestao} htmlFor="sugestao-marca">
                Sugestão para o aluno (opcional)
              </label>
              <textarea id="sugestao-marca" className={styles.sugestao} value={sugestao} onChange={(e) => setSugestao(e.target.value)} maxLength={LIMITE_SUGESTAO} rows={3} placeholder="Como o aluno pode melhorar este trecho?" />
              {erroMarca && <p className={styles.erro} role="alert">{erroMarca}</p>}
              <div className={styles.botoesMarca}>
                <Button variante="secundario" onClick={cancelarSelecao}>
                  Cancelar
                </Button>
                <Button onClick={adicionarMarca}>Adicionar marcação</Button>
              </div>
            </Card>
          )}

          <Card titulo={`Marcações (${marcas.length})`}>
            {marcas.length === 0 ? (
              <p className={styles.instrucao}>Nenhuma marcação ainda. As marcações ajudam o aluno a entender cada nota.</p>
            ) : (
              <ul className={styles.listaMarcas}>
                {marcas.map((m) => (
                  <li key={m.chave} className={styles.itemMarca}>
                    <div>
                      <Badge tom="neutro">{infoDoTipo(m.tipoErro).valor}</Badge>
                      <p className={styles.trecho}>“{texto.slice(m.inicio, m.fim)}”</p>
                      {m.sugestao && <p className={styles.sugestaoTexto}>{m.sugestao}</p>}
                    </div>
                    <button type="button" className={styles.remover} aria-label={`Remover marcação: ${texto.slice(m.inicio, m.fim)}`} onClick={() => setMarcas((a) => a.filter((x) => x.chave !== m.chave))}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
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
              evidencias={evidencias(comp.numero)}
            />
          ))}

          <Card titulo="Parecer geral (opcional)">
            <textarea className={styles.sugestao} value={parecer} onChange={(e) => setParecer(e.target.value)} maxLength={LIMITE_TEXTO} rows={4} aria-label="Parecer geral" placeholder="Visão geral do texto e orientações para o aluno." />
            <p className={styles.contador}>
              {parecer.length}/{LIMITE_TEXTO}
            </p>
          </Card>

          {ehAvaliativa && (
            <Card titulo="Recado para a Administração (opcional)">
              <textarea className={styles.sugestao} value={recado} onChange={(e) => setRecado(e.target.value)} maxLength={LIMITE_TEXTO} rows={3} aria-label="Recado para a Administração" placeholder="Observações que só a Administração verá." />
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
        <Button icone={<Send size={16} aria-hidden="true" />} onClick={() => validar() && setConfirmando(true)}>
          Enviar correção
        </Button>
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
          <p>{ehAvaliativa ? 'Ela seguirá para a revisão da Administração.' : 'Ela será liberada para o aluno imediatamente.'}</p>
        </div>
      </Modal>
    </>
  );
}