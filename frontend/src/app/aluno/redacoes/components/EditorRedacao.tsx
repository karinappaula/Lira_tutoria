'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Check, CloudOff, ExternalLink, FileText, Loader2, Paperclip, Send, Trash2 } from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Card } from '@/components/ui/Card/Card';
import { Textarea } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { useAutosave } from '@/hooks/useAutosave';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import {
  contarLinhas,
  contarPalavras,
  contarQuebrasLinha,
  formatarHora,
  MAX_LINHAS,
  MIN_LINHAS,
  podeExcluir,
  prazoEncerrado,
  ultimaVersao,
  urlSegura,
} from '@/lib/redacoes';
import { redacoesService } from '@/services/redacoes';
import type { RedacaoDetalhada } from '@/types/correcoes';
import { ultimaCorrecao } from '@/lib/correcoes';
import { ResultadoDaCorrecao } from '@/components/redacao/ResultadoDaCorrecao';
import { PainelDoTema } from './PainelDoTema';
import styles from './EditorRedacao.module.scss';

type Janela = 'enviar' | 'excluir' | null;

export function EditorRedacao({ redacao }: { redacao: RedacaoDetalhada }) {
  const router = useRouter();
  const toast = useToast();
  const versao = ultimaVersao(redacao);
  const { texto, alterar, estado, salvoEm, salvarAgora, encerrar } = useAutosave(redacao.id, versao?.conteudoTexto ?? '');

  const [janela, setJanela] = useState<Janela>(null);
  const [processando, setProcessando] = useState(false);
  const [erroDaJanela, setErroDaJanela] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const ehReescrita = versao?.numeroVersao === 2;
  const versaoUm = redacao.versoes.find((v) => v.numeroVersao === 1);
  const correcaoV1 = versaoUm ? ultimaCorrecao(versaoUm) : undefined;
  const [abaLateral, setAbaLateral] = useState<'tema' | 'correcao'>(ehReescrita && versaoUm ? 'correcao' : 'tema');

  const prazoVencido = !ehReescrita && redacao.tarefa ? prazoEncerrado(redacao.tarefa.prazoEntrega) : false;
  const palavras = useMemo(() => contarPalavras(texto), [texto]);
  const quebrasDeLinha = useMemo(() => contarQuebrasLinha(texto), [texto]);
  const linhas = useMemo(() => contarLinhas(texto), [texto]);
  const vazio = texto.trim() === '';

  const urlBruta =
    redacao.tarefa?.anexoUrl ||
    redacao.tarefa?.arquivoUrl ||
    redacao.tarefa?.anexos?.[0]?.caminhoArquivo ||
    null;
  const urlAnexo = urlBruta ? urlSegura(urlBruta) : null;

  // Avisa antes de fechar a aba se há texto ainda não salvo no servidor
  useEffect(() => {
    if (estado === 'salvo') return;
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [estado]);

  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    atualizar();
    window.addEventListener('online', atualizar);
    window.addEventListener('offline', atualizar);
    return () => {
      window.removeEventListener('online', atualizar);
      window.removeEventListener('offline', atualizar);
    };
  }, []);

  function fechar() {
    setJanela(null);
    setErroDaJanela(null);
  }

  async function enviar() {
    if (linhas < MIN_LINHAS) {
      setErroDaJanela('Sua redação possui menos de 8 linhas. Mínimo exigido: 8 linhas');
      return;
    }
    setProcessando(true);
    setErroDaJanela(null);
    try {
      if (!(await salvarAgora())) {
        setErroDaJanela('Não foi possível salvar o seu texto antes de enviar. Verifique a conexão e tente de novo. Seu texto continua guardado neste navegador.');
        setProcessando(false);
        return;
      }
      await redacoesService.enviar(redacao.id);
      encerrar(true);
      toast.sucesso(ehReescrita ? 'Reescrita enviada com sucesso!' : 'Redação enviada com sucesso!');
      router.replace('/aluno/redacoes');
    } catch (e) {
      setErroDaJanela(mensagemDeErro(e));
      if (e instanceof ApiError && e.codigo === 'PRAZO_ENCERRADO') router.refresh();
      setProcessando(false);
    }
  }

  async function excluir() {
    setProcessando(true);
    setErroDaJanela(null);
    try {
      await redacoesService.excluir(redacao.id);
      encerrar(true);
      toast.sucesso('Rascunho excluído.');
      router.replace('/aluno/redacoes');
    } catch (e) {
      setErroDaJanela(mensagemDeErro(e));
      setProcessando(false);
    }
  }

  const indicador = (() => {
    if (estado === 'bloqueado') return { icone: <CloudOff size={16} aria-hidden="true" />, texto: 'Esta redação não pode mais ser editada.', tom: styles.erro };
    if (estado === 'erro') {
      return {
        icone: <CloudOff size={16} aria-hidden="true" />,
        texto: online ? 'Não foi possível salvar. Tentando de novo...' : 'Sem conexão. Seu texto está guardado neste navegador e será salvo quando a internet voltar.',
        tom: styles.erro,
      };
    }
    if (estado === 'salvando') return { icone: <Loader2 size={16} aria-hidden="true" className={styles.girando} />, texto: 'Salvando...', tom: '' };
    if (estado === 'pendente') return { icone: <Loader2 size={16} aria-hidden="true" />, texto: 'Alterações ainda não salvas', tom: '' };
    return { icone: <Check size={16} aria-hidden="true" />, texto: salvoEm ? `Salvo às ${formatarHora(salvoEm)}` : 'Tudo salvo', tom: styles.ok };
  })();

  const bloqueado = estado === 'bloqueado';

  return (
    <>
      <div className={styles.layout}>
        <section className={styles.principal} aria-label="Editor da redação">
          <div className={styles.barra}>
            <p className={`${styles.indicador} ${indicador.tom}`} role="status" aria-live="polite">
              {indicador.icone}
              <span>{indicador.texto}</span>
            </p>
            <div className={styles.atalhos}>
              {urlAnexo && (
                <a
                  href={urlAnexo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.atalhoAnexo}
                  title="Abrir anexo da tarefa em nova aba"
                >
                  <Paperclip size={15} aria-hidden="true" />
                  <span>Anexo</span>
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          {bloqueado && (
            <div className={styles.espaco}>
              <Alerta tom="erro">
                Esta versão já foi enviada ou bloqueada. <button type="button" className={styles.link} onClick={() => router.refresh()}>Atualizar a página</button>
              </Alerta>
            </div>
          )}
          {prazoVencido && (
            <div className={styles.espaco}>
              <Alerta tom="erro">O prazo desta tarefa já foi encerrado. Você ainda pode salvar o rascunho, mas não é mais possível enviar.</Alerta>
            </div>
          )}
          {ehReescrita && (
            <div className={styles.espaco}>
              <Alerta tom="alerta">
                Reescrita em andamento: Seu tutor avaliou a versão anterior. Consulte a correção no painel lateral para reescrever seu texto.
              </Alerta>
            </div>
          )}

          {/* Bloco de Anexo visível durante a escrita no Mobile e Tablet */}
          {urlAnexo && (
            <div className={styles.barraAnexoMobile}>
              <a
                href={urlAnexo}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.botaoVisualizarAnexoTopo}
              >
                <FileText size={16} aria-hidden="true" />
                <span>Visualizar Anexo da Tarefa (PDF/Imagem)</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          )}

          <Textarea
            rotulo="Texto da redação"
            ocultarRotulo
            className={styles.texto}
            value={texto}
            onChange={(e) => alterar(e.target.value)}
            placeholder="Escreva sua redação aqui. O texto é salvo automaticamente."
            disabled={bloqueado}
            spellCheck
            lang="pt-BR"
          />

          {/* Avisos dinâmicos de limite de linhas */}
          {!vazio && linhas < MIN_LINHAS && (
            <div className={styles.avisoLinhas}>
              <Alerta tom="erro">
                Sua redação possui menos de 8 linhas. Mínimo exigido: 8 linhas
              </Alerta>
            </div>
          )}
          {linhas > MAX_LINHAS && (
            <div className={styles.avisoLinhas}>
              <Alerta tom="alerta">
                Atenção: Sua redação ultrapassou o limite máximo de 30 linhas. Pode continuar escrevendo, porém lembre-se de que, em uma redação do Enem, o máximo são 30 linhas.
              </Alerta>
            </div>
          )}

          <div className={styles.rodape}>
            <div className={styles.contagemWrapper}>
              <p className={styles.contagem} aria-live="off">
                {palavras} {palavras === 1 ? 'palavra' : 'palavras'} · {texto.length.toLocaleString('pt-BR')} caracteres · {quebrasDeLinha} {quebrasDeLinha === 1 ? 'quebra de linha' : 'quebras de linha'}
              </p>
              <div
                className={`${styles.indicadorLinhas} ${
                  vazio
                    ? styles.indicadorNeutro
                    : linhas < MIN_LINHAS
                    ? styles.indicadorErro
                    : linhas > MAX_LINHAS
                    ? styles.indicadorAlerta
                    : styles.indicadorNeutro
                }`}
                role="status"
              >
                <span>Linhas: {linhas}/30</span>
              </div>
            </div>
            <div className={styles.botoes}>
              {podeExcluir(redacao) && (
                <Button variante="perigo" icone={<Trash2 size={16} aria-hidden="true" />} onClick={() => setJanela('excluir')} disabled={bloqueado}>
                  Excluir rascunho
                </Button>
              )}
              <Button
                icone={<Send size={16} aria-hidden="true" />}
                onClick={() => setJanela('enviar')}
                disabled={vazio || bloqueado || prazoVencido || linhas < MIN_LINHAS}
                title={
                  vazio
                    ? 'Digite sua redação antes de enviar'
                    : linhas < MIN_LINHAS
                    ? 'Sua redação possui menos de 8 linhas. Mínimo exigido: 8 linhas'
                    : prazoVencido
                    ? 'O prazo desta tarefa já foi encerrado'
                    : undefined
                }
              >
                {ehReescrita ? 'Enviar reescrita' : 'Enviar redação'}
              </Button>
            </div>
          </div>
        </section>

        <aside className={styles.lateral} aria-label="Tema e apoio da redação">
          {ehReescrita && versaoUm ? (
            <>
              <div className={styles.abasLateral} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaLateral === 'correcao'}
                  className={`${styles.abaBotao} ${abaLateral === 'correcao' ? styles.abaAtiva : ''}`}
                  onClick={() => setAbaLateral('correcao')}
                >
                  Correção da Versão 1
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaLateral === 'tema'}
                  className={`${styles.abaBotao} ${abaLateral === 'tema' ? styles.abaAtiva : ''}`}
                  onClick={() => setAbaLateral('tema')}
                >
                  Tema e Apoio
                </button>
              </div>

              {abaLateral === 'correcao' ? (
                <div className={styles.painelCorrecaoLateral}>
                  {correcaoV1 ? (
                    <ResultadoDaCorrecao texto={versaoUm.conteudoTexto} correcao={correcaoV1} coluna />
                  ) : (
                    <div className={styles.versaoUmSemCorrecao}>
                      <p className={styles.semCorrecao}>
                        Nenhuma correção detalhada encontrada para a versão 1.
                      </p>
                      <Card titulo="Texto da Versão 1">
                        <p className={styles.textoVersaoUm}>{versaoUm.conteudoTexto}</p>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <PainelDoTema redacao={redacao} />
              )}
            </>
          ) : (
            <>
              <h2 className={styles.lateralTitulo}>Tema e Apoio</h2>
              <PainelDoTema redacao={redacao} />
            </>
          )}
        </aside>
      </div>

      <Modal
        aberto={janela === 'enviar'}
        aoFechar={fechar}
        titulo={ehReescrita ? 'Enviar a reescrita?' : 'Enviar a redação?'}
        rodape={
          <>
            <Button variante="secundario" onClick={fechar} disabled={processando}>
              Continuar escrevendo
            </Button>
            <Button
              icone={<Send size={16} aria-hidden="true" />}
              carregando={processando}
              disabled={linhas < MIN_LINHAS}
              onClick={() => void enviar()}
            >
              Confirmar envio
            </Button>
          </>
        }
      >
        <div className={styles.confirmacao}>
          {erroDaJanela && <Alerta tom="erro">{erroDaJanela}</Alerta>}
          <p>
            Seu texto tem <strong>{linhas} {linhas === 1 ? 'linha' : 'linhas'}</strong>, <strong>{quebrasDeLinha} {quebrasDeLinha === 1 ? 'quebra de linha' : 'quebras de linha'}</strong> e <strong>{palavras} palavras</strong>.
          </p>
          {linhas > MAX_LINHAS && (
            <Alerta tom="alerta">
              Atenção: Sua redação ultrapassou o limite máximo de 30 linhas
            </Alerta>
          )}
          <p className={styles.resumoEnvio}>
            {ehReescrita
              ? 'Esta reescrita será enviada para o seu tutor. Não será possível fazer novas alterações depois.'
              : 'Depois do envio, o texto entra na fila do seu tutor e você não poderá editá-lo enquanto aguarda a correção.'}
          </p>
        </div>
      </Modal>

      <Modal
        aberto={janela === 'excluir'}
        aoFechar={fechar}
        titulo="Excluir este rascunho?"
        rodape={
          <>
            <Button variante="secundario" onClick={fechar} disabled={processando}>
              Cancelar
            </Button>
            <Button variante="perigo" carregando={processando} onClick={() => void excluir()}>
              Excluir
            </Button>
          </>
        }
      >
        <div className={styles.confirmacao}>
          {erroDaJanela && <Alerta tom="erro">{erroDaJanela}</Alerta>}
          <p>Esta ação não pode ser desfeita. Todo o texto escrito neste rascunho será perdido.</p>
        </div>
      </Modal>
    </>
  );
}
