'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Select } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useBuscar } from '@/hooks/useBuscar';
import { formatarData } from '@/lib/formatar';
import { tutorService } from '@/services/tutor';
import type { ItemDoHistorico } from '@/types/correcoes';
import styles from './Tutor.module.scss';

const TOM: Record<ItemDoHistorico['statusAprovacao'], TomDoBadge> = {
  APROVADA: 'sucesso',
  LIBERADA: 'sucesso',
  PENDENTE_APROVACAO: 'alerta',
  AJUSTE_SOLICITADO: 'perigo',
};

/** Últimos 12 meses no formato "AAAA-MM", com o nome do mês em português. */
function ultimosMeses(): Array<{ valor: string; rotulo: string }> {
  const hoje = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rotulo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d);
    return { valor, rotulo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1) };
  });
}

export function HistoricoDoTutor() {
  const [mes, setMes] = useState('');
  const meses = useMemo(ultimosMeses, []);
  const { dados, carregando, erro, recarregar } = useBuscar((signal) => tutorService.historico(mes || undefined, signal), mes);
  const itens = dados ?? [];

  const colunas: Coluna<ItemDoHistorico>[] = [
    { chave: 'aluno', titulo: 'Aluno', celula: (i) => <strong>{i.aluno.nome}</strong> },
    { chave: 'turma', titulo: 'Turma', celula: (i) => i.turma?.nome ?? '—' },
    { chave: 'data', titulo: 'Data', celula: (i) => formatarData(i.data) },
    { chave: 'nota', titulo: 'Nota final', alinhamento: 'centro', celula: (i) => <strong>{i.notaTotal ?? '—'}/1000</strong> },
    { chave: 'status', titulo: 'Status', celula: (i) => <Badge tom={TOM[i.statusAprovacao]}>{i.statusRotulo}</Badge> },
    { chave: 'ajustes', titulo: 'Ajustes', alinhamento: 'centro', celula: (i) => i.ajustes },
    {
      chave: 'acao',
      titulo: 'Ação',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (i) => (
        <Link href={`/tutor/redacoes/${i.idRedacao}`} className={styles.acaoLink}>
          Ver redação
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader titulo="Histórico de correções" descricao="Histórico total de revisões realizadas por você para esta turma." />
      <div className={styles.barraFerramentas}>
        <div className={styles.filtro}>
          <Select rotulo="Mês" ocultarRotulo value={mes} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todos os meses</option>
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </Select>
        </div>
        {!carregando && !erro && <p className={styles.contagem}>{itens.length} {itens.length === 1 ? 'correção' : 'correções'}</p>}
      </div>
      {carregando ? (
        <CarregandoPagina rotulo="Carregando o histórico" />
      ) : erro ? (
        <ErrorState mensagem={erro.message} conexao={erro.ehErroDeConexao} aoTentarNovamente={recarregar} />
      ) : itens.length === 0 ? (
        <div className={styles.vazio}>
          <EmptyState titulo="Nenhuma correção encontrada" descricao={mes ? 'Não há correções neste mês.' : 'Suas correções aparecem aqui depois que você corrigir uma redação.'} />
        </div>
      ) : (
        <Tabela colunas={colunas} linhas={itens} chaveDaLinha={(i) => i.idCorrecao} descricao="Histórico de correções realizadas" />
      )}
    </>
  );
}