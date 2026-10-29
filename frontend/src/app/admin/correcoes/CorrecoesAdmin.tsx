'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Eye,
  GraduationCap,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useBuscar } from '@/hooks/useBuscar';
import { formatarDataHora } from '@/lib/formatar';
import { adminService, type CorrecaoPendenteItem } from '@/services/admin';
import { ModalRevisaoCorrecao } from './ModalRevisaoCorrecao';
import styles from './CorrecoesAdmin.module.scss';

export function CorrecoesAdmin() {
  const [busca, setBusca] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState<string>('TODAS');
  const [correcaoSelecionada, setCorrecaoSelecionada] = useState<CorrecaoPendenteItem | null>(null);

  const { dados, carregando, erro, recarregar } = useBuscar((signal) =>
    adminService.correcoesPendentes(signal)
  );
  const correcoes = dados ?? [];

  // Turmas únicas presentes na fila para o seletor de filtro
  const turmasDisponiveis = useMemo(() => {
    const nomes = new Set<string>();
    correcoes.forEach((c) => {
      const nome = c.versao.redacao.aluno.tutor?.turma?.nome;
      if (nome) nomes.add(nome);
    });
    return Array.from(nomes);
  }, [correcoes]);

  // Lista filtrada
  const correcoesFiltradas = useMemo(() => {
    return correcoes.filter((c) => {
      const termo = busca.toLowerCase().trim();
      const alunoNome = c.versao.redacao.aluno.usuario.nome.toLowerCase();
      const tutorNome = c.tutor.usuario.nome.toLowerCase();
      const temaTitulo = (
        c.versao.redacao.tema?.tituloTema ??
        c.versao.redacao.tarefa?.tituloTarefa ??
        ''
      ).toLowerCase();
      const turmaNome = c.versao.redacao.aluno.tutor?.turma?.nome ?? '';

      if (termo && !alunoNome.includes(termo) && !tutorNome.includes(termo) && !temaTitulo.includes(termo)) {
        return false;
      }
      if (turmaFiltro !== 'TODAS' && turmaNome !== turmaFiltro) {
        return false;
      }
      return true;
    });
  }, [correcoes, busca, turmaFiltro]);

  // Métricas rápidas
  const totalPendentes = correcoes.length;
  const tutoresDistintos = useMemo(() => {
    return new Set(correcoes.map((c) => c.idTutor)).size;
  }, [correcoes]);
  const mediaNotas = useMemo(() => {
    if (correcoes.length === 0) return 0;
    const soma = correcoes.reduce((acc, c) => acc + (Number(c.notaTotal) || 0), 0);
    return Math.round(soma / correcoes.length);
  }, [correcoes]);

  const colunas: Coluna<CorrecaoPendenteItem>[] = [
    {
      chave: 'aluno',
      titulo: 'Aluno',
      celula: (c) => (
        <div className={styles.colunaAluno}>
          <strong className={styles.nomeAluno}>{c.versao.redacao.aluno.usuario.nome}</strong>
          <span className={styles.emailAluno}>{c.versao.redacao.aluno.usuario.email}</span>
        </div>
      ),
    },
    {
      chave: 'turma',
      titulo: 'Turma',
      celula: (c) => (
        <Badge tom="neutro">
          {c.versao.redacao.aluno.tutor?.turma?.nome ?? 'Sem turma'}
        </Badge>
      ),
    },
    {
      chave: 'tutor',
      titulo: 'Tutor Avaliador',
      celula: (c) => <strong>{c.tutor.usuario.nome}</strong>,
    },
    {
      chave: 'tema',
      titulo: 'Tema / Atividade',
      celula: (c) => {
        const titulo =
          c.versao.redacao.tema?.tituloTema ??
          c.versao.redacao.tarefa?.tituloTarefa ??
          'Redação Geral';
        return (
          <div className={styles.colunaTema} title={titulo}>
            <span className={styles.tituloTema}>{titulo}</span>
            <span className={styles.versaoTema}>
              Versão {c.versao.numeroVersao}
              {c.numeroAjuste > 0 ? ` · Reenvio #${c.numeroAjuste}` : ''}
            </span>
          </div>
        );
      },
    },
    {
      chave: 'nota',
      titulo: 'Nota Sugerida',
      alinhamento: 'centro',
      celula: (c) => (
        <span className={styles.notaLinha}>
          {Number(c.notaTotal) || 0} <span>/ 1000</span>
        </span>
      ),
    },
    {
      chave: 'data',
      titulo: 'Data da Correção',
      alinhamento: 'centro',
      celula: (c) => (
        <span className={styles.dataLinha}>
          {formatarDataHora(c.dataCorrecao)}
        </span>
      ),
    },
    {
      chave: 'acoes',
      titulo: 'Ação',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (c) => (
        <div className={styles.acoesLinha}>
          <Button
            variante="primario"
            tamanho="sm"
            icone={<Eye size={15} aria-hidden="true" />}
            onClick={() => setCorrecaoSelecionada(c)}
          >
            Revisar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Fila de Revisão de Correções"
        descricao="Auditoria de qualidade pedagógica das redações avaliativas antes da liberação das notas aos alunos."
      />

      {/* Cartões de Indicadores da Fila */}
      <section className={styles.gradeMetricas} aria-label="Métricas da fila de revisão">
        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetricaAlerta}>
            <AlertCircle size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Aguardando Aprovação</span>
            <strong className={styles.valorMetrica}>{totalPendentes}</strong>
            <span className={styles.subMetrica}>Redações avaliativas</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetricaPrimaria}>
            <GraduationCap size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Tutores com Envios</span>
            <strong className={styles.valorMetrica}>{tutoresDistintos}</strong>
            <span className={styles.subMetrica}>Aguardando parecer final</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetricaPrimaria}>
            <Award size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Média das Notas Sugeridas</span>
            <strong className={styles.valorMetrica}>{mediaNotas} / 1000</strong>
            <span className={styles.subMetrica}>Média geral da fila</span>
          </div>
        </div>
      </section>

      {/* Barra de Filtros */}
      <div className={styles.barraFerramentas}>
        <div className={styles.grupoFiltros}>
          <div className={styles.busca}>
            <Input
              rotulo="Buscar correção"
              ocultarRotulo
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por aluno, tutor ou tema..."
            />
          </div>

          {turmasDisponiveis.length > 0 && (
            <div className={styles.seletorFiltro}>
              <Select
                rotulo="Filtrar por Turma"
                ocultarRotulo
                value={turmaFiltro}
                onChange={(e) => setTurmaFiltro(e.target.value)}
              >
                <option value="TODAS">Todas as turmas</option>
                {turmasDisponiveis.map((turma) => (
                  <option key={turma} value={turma}>
                    {turma}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {!carregando && !erro && (
          <p className={styles.contagem}>
            {correcoesFiltradas.length}{' '}
            {correcoesFiltradas.length === 1 ? 'correção pendente' : 'correções pendentes'}
          </p>
        )}
      </div>

      {/* Conteúdo Principal */}
      {carregando ? (
        <CarregandoPagina rotulo="Carregando fila de revisão..." />
      ) : erro ? (
        <ErrorState
          mensagem={erro.message}
          conexao={erro.ehErroDeConexao}
          aoTentarNovamente={recarregar}
        />
      ) : correcoesFiltradas.length === 0 ? (
        <div className={styles.vazio}>
          <EmptyState
            titulo={
              busca || turmaFiltro !== 'TODAS'
                ? 'Nenhuma correção corresponde aos filtros aplicados'
                : 'Fila limpa! Nenhuma correção pendente'
            }
            descricao={
              busca || turmaFiltro !== 'TODAS'
                ? 'Tente alterar ou limpar os termos de busca.'
                : 'Todas as redações avaliativas submetidas pelos tutores foram revisadas e liberadas aos alunos.'
            }
          />
        </div>
      ) : (
        <Tabela
          colunas={colunas}
          linhas={correcoesFiltradas}
          chaveDaLinha={(c) => c.id}
          descricao="Lista de correções de redação pendentes de aprovação administrativa"
        />
      )}

      {/* Modal de Revisão Lado a Lado */}
      <ModalRevisaoCorrecao
        correcao={correcaoSelecionada}
        aberto={Boolean(correcaoSelecionada)}
        aoFechar={() => setCorrecaoSelecionada(null)}
        aoSucesso={recarregar}
      />
    </>
  );
}
