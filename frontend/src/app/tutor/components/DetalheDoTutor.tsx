'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { VersoesDaRedacao } from '@/components/redacao/VersoesDaRedacao';
import { LinkBotao } from '@/components/ui/Button/LinkBotao';
import { ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { useBuscar } from '@/hooks/useBuscar';
import { rotuloDoFluxo, tituloDaRedacao } from '@/lib/redacoes';
import { redacoesService } from '@/services/redacoes';
import styles from './Tutor.module.scss';

/** Redação de um tutorado: histórico, correção e ações do Tutor (corrigir, solicitar reescrita). */
export function DetalheDoTutor({ id }: { id: number }) {
  const { dados, carregando, erro, recarregar } = useBuscar((signal) => redacoesService.obter(id, signal), id);

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
          v.statusVersao === 'AGUARDANDO_REESCRITA' || v.statusVersao === 'REESCRITA_SOLICITADA'
            ? 'Reescrita solicitada. Aguardando o aluno escrever a nova versão.'
            : v.statusVersao === 'RASCUNHO'
            ? 'O aluno ainda está escrevendo esta versão.'
            : null
        }
        acoes={(v) => {
          if (v.id !== ultima?.id) return null;
          if (v.statusVersao === 'ENVIADA' || v.statusVersao === 'AJUSTE_SOLICITADO') {
            return <LinkBotao href={`/tutor/fila/${dados.id}`}>{v.statusVersao === 'AJUSTE_SOLICITADO' ? 'Corrigir novamente' : 'Corrigir'}</LinkBotao>;
          }
          return null;
        }}
      />
    </>
  );
}
