'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { useBuscar } from '@/hooks/useBuscar';
import { rotuloDoFluxo, tituloDaRedacao, ultimaVersao } from '@/lib/redacoes';
import { redacoesService } from '@/services/redacoes';
import { EditorRedacao } from './EditorRedacao';
import { LeituraRedacao } from './LeituraRedacao';
import styles from './DetalheRedacao.module.scss';

/** Abre o editor se a versão atual é rascunho; senão, mostra a redação em modo leitura. */
export function DetalheRedacao({ id }: { id: number }) {
  const { dados, carregando, erro, recarregar } = useBuscar((signal) => redacoesService.obter(id, signal), id);

  const voltar = (
    <Link href="/aluno/redacoes" className={styles.voltar}>
      <ArrowLeft size={16} aria-hidden="true" /> Minhas redações
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

  const versao = ultimaVersao(dados);
  const emEdicao = versao?.statusVersao === 'RASCUNHO';
  const descricao = [
    rotuloDoFluxo(dados.tipoFluxo),
    versao?.numeroVersao === 2 ? 'Reescrita (versão 2)' : null,
    dados.tarefa ? `Tarefa: ${dados.tarefa.tituloTarefa}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      {voltar}
      <PageHeader titulo={tituloDaRedacao(dados)} descricao={descricao} />
      {emEdicao ? <EditorRedacao key={`${dados.id}-${versao?.id}`} redacao={dados} /> : <LeituraRedacao redacao={dados} />}
    </>
  );
}