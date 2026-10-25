'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { mensagemDeErro } from '@/lib/erros';
import { formatarData } from '@/lib/formatar';
import { prazoEncerrado, rotuloDoFluxo, statusParaAluno, tituloDaRedacao, ultimaVersao } from '@/lib/redacoes';
import { redacoesService, tarefasService } from '@/services/redacoes';
import type { Redacao, TarefaDoAluno } from '@/types/redacoes';
import { CartaoDeTarefa } from './CartaoDeTarefa';
import { NovaRedacaoModal } from './NovaRedacaoModal';
import styles from './ListaDeRedacoes.module.scss';

export function ListaDeRedacoes() {
  const router = useRouter();
  const toast = useToast();
  const redacoes = useBuscar((signal) => redacoesService.listar(signal));
  const tarefas = useBuscar((signal) => tarefasService.listarDoAluno(signal));
  const [modalAberto, setModalAberto] = useState(false);
  const [iniciandoTarefa, setIniciandoTarefa] = useState<number | null>(null);

  const tarefasAbertas = useMemo<TarefaDoAluno[]>(
    () => (tarefas.dados ?? []).filter((t) => t.idRedacao === null && !prazoEncerrado(t.prazoEntrega)),
    [tarefas.dados],
  );
  const tarefasSemRedacao = useMemo<TarefaDoAluno[]>(() => (tarefas.dados ?? []).filter((t) => t.idRedacao === null), [tarefas.dados]);

  async function comecarTarefa(tarefa: TarefaDoAluno) {
    setIniciandoTarefa(tarefa.id);
    try {
      const nova = await redacoesService.criar({ tipoFluxo: 'AVALIATIVA', idTarefa: tarefa.id });
      router.push(`/aluno/redacoes/${nova.id}`);
    } catch (e) {
      toast.erro(mensagemDeErro(e));
      setIniciandoTarefa(null);
    }
  }

  const colunas: Coluna<Redacao>[] = [
    {
      chave: 'redacao',
      titulo: 'Redação',
      celula: (r) => (
        <div className={styles.titulo}>
          <strong>{tituloDaRedacao(r)}</strong>
          <span className={styles.meta}>
            {rotuloDoFluxo(r.tipoFluxo)} · criada em {formatarData(r.criadoEm)}
          </span>
        </div>
      ),
    },
    {
      chave: 'status',
      titulo: 'Status',
      celula: (r) => {
        const s = statusParaAluno(ultimaVersao(r));
        return <Badge tom={s.tom}>{s.rotulo}</Badge>;
      },
    },
    {
      chave: 'acao',
      titulo: 'Ação',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (r) => (
        <Link href={`/aluno/redacoes/${r.id}`} className={styles.acao}>
          {ultimaVersao(r)?.statusVersao === 'RASCUNHO' ? 'Continuar' : 'Ver'}
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Minhas redações"
        descricao="Acompanhe todos os seus textos submetidos, rascunhos e correções do corretor."
        acao={
          <Button icone={<Plus size={18} aria-hidden="true" />} onClick={() => setModalAberto(true)}>
            Nova redação
          </Button>
        }
      />

      {tarefas.erro && (
        <div className={styles.espaco}>
          <Alerta tom="info">Não foi possível carregar as tarefas do seu tutor agora. Você ainda pode usar suas redações abaixo.</Alerta>
        </div>
      )}

      {tarefasSemRedacao.length > 0 && (
        <section className={styles.tarefas} aria-labelledby="titulo-tarefas">
          <h2 id="titulo-tarefas" className={styles.subtitulo}>
            Tarefas do seu tutor
          </h2>
          <ul className={styles.listaTarefas}>
            {tarefasSemRedacao.map((t) => (
              <li key={t.id}>
                <CartaoDeTarefa tarefa={t} iniciando={iniciandoTarefa === t.id} aoComecar={() => void comecarTarefa(t)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {redacoes.carregando ? (
        <CarregandoPagina rotulo="Carregando suas redações" />
      ) : redacoes.erro ? (
        <ErrorState mensagem={redacoes.erro.message} conexao={redacoes.erro.ehErroDeConexao} aoTentarNovamente={redacoes.recarregar} />
      ) : (redacoes.dados ?? []).length === 0 ? (
        <div className={styles.vazio}>
          <EmptyState
            titulo="Você ainda não tem redações"
            descricao="Comece uma redação de treino com um tema à sua escolha ou faça uma tarefa do seu tutor."
            acao={
              <Button icone={<FileText size={18} aria-hidden="true" />} onClick={() => setModalAberto(true)}>
                Criar minha primeira redação
              </Button>
            }
          />
        </div>
      ) : (
        <Tabela colunas={colunas} linhas={redacoes.dados ?? []} chaveDaLinha={(r) => r.id} descricao="Lista das suas redações" />
      )}

      {modalAberto && <NovaRedacaoModal tarefasAbertas={tarefasAbertas} aoFechar={() => setModalAberto(false)} />}
    </>
  );
}