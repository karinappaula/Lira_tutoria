'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { VersoesDaRedacao } from '@/components/redacao/VersoesDaRedacao';
import { Button } from '@/components/ui/Button/Button';
import { LinkBotao } from '@/components/ui/Button/LinkBotao';
import { ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { mensagemDeErro } from '@/lib/erros';
import { rotuloDoFluxo, tituloDaRedacao } from '@/lib/redacoes';
import { redacoesService } from '@/services/redacoes';
import { tutorService } from '@/services/tutor';
import styles from './Tutor.module.scss';

/** Redação de um tutorado: histórico, correção e ações do Tutor (corrigir, solicitar reescrita). */
export function DetalheDoTutor({ id }: { id: number }) {
  const toast = useToast();
  const { dados, carregando, erro, recarregar } = useBuscar((signal) => redacoesService.obter(id, signal), id);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const voltar = (
    <Link href="/tutor/historico" className={styles.acaoLink}>
      <ArrowLeft size={16} aria-hidden="true" /> Histórico
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

  const ultima = dados.versoes[dados.versoes.length - 1];

  async function solicitar() {
    setEnviando(true);
    try {
      await tutorService.solicitarReescrita(id);
      toast.sucesso('Reescrita solicitada. O aluno já pode começar.');
      setConfirmando(false);
      recarregar();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {voltar}
      <PageHeader
        titulo={tituloDaRedacao(dados)}
        descricao={`${dados.aluno?.usuario.nome ?? 'Aluno'} · ${rotuloDoFluxo(dados.tipoFluxo)}`}
      />
      <VersoesDaRedacao
        redacao={dados}
        visaoInterna
        mensagem={(v) =>
          v.statusVersao === 'AGUARDANDO_REESCRITA' ? 'Reescrita solicitada. Aguardando o aluno escrever a nova versão.' : v.statusVersao === 'RASCUNHO' ? 'O aluno ainda está escrevendo esta versão.' : null
        }
        acoes={(v) => {
          if (v.id !== ultima?.id) return null;
          if (v.statusVersao === 'ENVIADA' || v.statusVersao === 'AJUSTE_SOLICITADO') {
            return <LinkBotao href={`/tutor/fila/${dados.id}`}>{v.statusVersao === 'AJUSTE_SOLICITADO' ? 'Corrigir novamente' : 'Corrigir'}</LinkBotao>;
          }
          if (v.statusVersao === 'CORRIGIDA' && v.numeroVersao === 1) {
            return (
              <Button variante="secundario" icone={<RotateCcw size={16} aria-hidden="true" />} onClick={() => setConfirmando(true)}>
                Solicitar reescrita
              </Button>
            );
          }
          return null;
        }}
      />

      <Modal
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo="Solicitar reescrita?"
        rodape={
          <>
            <Button variante="secundario" disabled={enviando} onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button carregando={enviando} onClick={() => void solicitar()}>
              Solicitar reescrita
            </Button>
          </>
        }
      >
        <p>O aluno poderá escrever uma única reescrita. Depois de enviada, ela será a versão final e não haverá nova tentativa.</p>
      </Modal>
    </>
  );
}