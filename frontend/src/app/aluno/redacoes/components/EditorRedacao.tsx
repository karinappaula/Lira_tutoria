'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, CloudOff, History, Loader2, Send, Trash2 } from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Textarea } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { useAutosave } from '@/hooks/useAutosave';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { contarPalavras, formatarHora, podeExcluir, prazoEncerrado, ultimaVersao } from '@/lib/redacoes';
import { redacoesService } from '@/services/redacoes';
import type { RedacaoDetalhada } from '@/types/correcoes';
import { ultimaCorrecao } from '@/lib/correcoes';
import { ResultadoDaCorrecao } from '@/components/redacao/ResultadoDaCorrecao';
import { PainelDoTema } from './PainelDoTema';
import styles from './EditorRedacao.module.scss';

type Janela = 'tema' | 'enviar' | 'excluir' | 'versao1' | null;

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
  const prazoVencido = !ehReescrita && redacao.tarefa ? prazoEncerrado(redacao.tarefa.prazoEntrega) : false;
  const palavras = useMemo(() => contarPalavras(texto), [texto]);
  const vazio = texto.trim() === '';

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
              <Button variante="secundario" tamanho="sm" icone={<BookOpen size={16} aria-hidden="true" />} className={styles.soCelular} onClick={() => setJanela('tema')}>
                Ver tema
              </Button>
              {ehReescrita && versaoUm && (
                <Button variante="secundario" tamanho="sm" icone={<History size={16} aria-hidden="true" />} onClick={() => setJanela('versao1')}>
                  Ver versão 1
                </Button>
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
              <Alerta tom="info">Esta é a sua reescrita. Depois de enviada, ela será a versão final e não haverá nova tentativa.</Alerta>
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

          <div className={styles.rodape}>
            <p className={styles.contagem} aria-live="off">
              {palavras} {palavras === 1 ? 'palavra' : 'palavras'} · {texto.length.toLocaleString('pt-BR')} caracteres
            </p>
            <div className={styles.botoes}>
              {podeExcluir(redacao) && (
                <Button variante="perigo" icone={<Trash2 size={16} aria-hidden="true" />} onClick={() => setJanela('excluir')} disabled={bloqueado}>
                  Excluir rascunho
                </Button>
              )}
              <Button icone={<Send size={16} aria-hidden="true" />} onClick={() => setJanela('enviar')} disabled={vazio || bloqueado || prazoVencido}>
                {ehReescrita ? 'Enviar reescrita' : 'Enviar redação'}
              </Button>
            </div>
          </div>
        </section>

        <aside className={styles.lateral} aria-label="Tema da redação">
          <h2 className={styles.lateralTitulo}>Tema</h2>
          <PainelDoTema redacao={redacao} />
        </aside>
      </div>

      <Modal aberto={janela === 'tema'} aoFechar={fechar} titulo="Tema da redação">
        <PainelDoTema redacao={redacao} />
      </Modal>

      <Modal aberto={janela === 'versao1'} aoFechar={fechar} titulo="Sua versão 1 e a correção">
        {versaoUm && ultimaCorrecao(versaoUm) ? (
          <ResultadoDaCorrecao texto={versaoUm.conteudoTexto} correcao={ultimaCorrecao(versaoUm)!} coluna />
        ) : (
          <p className={styles.versaoUm}>{versaoUm?.conteudoTexto || 'Texto vazio.'}</p>
        )}
      </Modal>

      <Modal
        aberto={janela === 'enviar'}
        aoFechar={fechar}
        titulo={ehReescrita ? 'Enviar a reescrita?' : 'Enviar a redação?'}
        rodape={
          <>
            <Button variante="secundario" onClick={fechar} disabled={processando}>
              Voltar e revisar
            </Button>
            <Button onClick={() => void enviar()} carregando={processando}>
              Enviar agora
            </Button>
          </>
        }
      >
        <div className={styles.confirmacao}>
          {erroDaJanela && <Alerta tom="erro">{erroDaJanela}</Alerta>}
          <p>
            Depois de enviar, <strong>você não poderá mais editar</strong> este texto.
            {ehReescrita ? ' Esta reescrita será a versão final.' : ''}
          </p>
          <p className={styles.resumoEnvio}>
            {palavras} {palavras === 1 ? 'palavra' : 'palavras'} · {texto.length.toLocaleString('pt-BR')} caracteres
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
            <Button variante="perigo" onClick={() => void excluir()} carregando={processando}>
              Excluir rascunho
            </Button>
          </>
        }
      >
        <div className={styles.confirmacao}>
          {erroDaJanela && <Alerta tom="erro">{erroDaJanela}</Alerta>}
          <p>O texto escrito será apagado e não poderá ser recuperado.</p>
        </div>
      </Modal>
    </>
  );
}