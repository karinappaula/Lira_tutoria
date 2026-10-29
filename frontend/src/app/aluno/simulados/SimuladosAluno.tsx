'use client';

import { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Eye,
  GraduationCap,
  Play,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { formatarDataHora, formatarTempoSegundos } from '@/lib/formatar';
import { questoesService } from '@/services/questoes';
import { simuladosService } from '@/services/simulados';
import type { ResultadoSimulado, SimuladoExecucao, SimuladoResumo } from '@/types/simulados';
import { ExecucaoSimulado } from './ExecucaoSimulado';
import { ModalConfigurarSimulado } from './ModalConfigurarSimulado';
import { ResultadoSimuladoModal } from './ResultadoSimuladoModal';
import styles from './SimuladosAluno.module.scss';

function tomStatus(status: string): TomDoBadge {
  switch (status?.toUpperCase()) {
    case 'FINALIZADO':
      return 'sucesso';
    case 'EM_ANDAMENTO':
      return 'alerta';
    case 'PAUSADO':
      return 'neutro';
    case 'CRIADO':
      return 'alerta';
    default:
      return 'neutro';
  }
}

export function SimuladosAluno() {
  const toast = useToast();

  // Lista de simulados do aluno
  const {
    dados: simulados,
    carregando,
    erro,
    recarregar,
  } = useBuscar((signal) => simuladosService.listar(signal));

  // Assuntos para o modal de configuração
  const { dados: assuntosRaw } = useBuscar((signal) => questoesService.listarAssuntos(signal));
  const assuntos = assuntosRaw ?? [];

  // Modais e Estados de Execução
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [simuladoEmExecucao, setSimuladoEmExecucao] = useState<SimuladoExecucao | null>(null);
  const [carregandoExecucao, setCarregandoExecucao] = useState(false);

  // Modal de Resultado
  const [modalResultadoAberto, setModalResultadoAberto] = useState(false);
  const [resultadoAtual, setResultadoAtual] = useState<ResultadoSimulado | null>(null);
  const [carregandoResultado, setCarregandoResultado] = useState(false);

  // Iniciar ou retomar execução de um simulado da tabela
  async function abrirSimulado(simuladoResumo: SimuladoResumo) {
    setCarregandoExecucao(true);
    try {
      let simExec = await simuladosService.obter(simuladoResumo.id);
      if (simExec.statusSimulado === 'CRIADO') {
        simExec = await simuladosService.iniciar(simExec.id);
      }
      setSimuladoEmExecucao(simExec);
    } catch (err) {
      toast.erro('Não foi possível carregar o simulado.');
    } finally {
      setCarregandoExecucao(false);
    }
  }

  // Ver resultado de um simulado finalizado
  async function abrirResultado(idSimulado: number) {
    setCarregandoResultado(true);
    try {
      const res = await simuladosService.obterResultado(idSimulado);
      setResultadoAtual(res);
      setModalResultadoAberto(true);
    } catch (err) {
      toast.erro('Não foi possível consultar o gabarito deste simulado.');
    } finally {
      setCarregandoResultado(false);
    }
  }

  // Métricas
  const totalSimulados = simulados?.length ?? 0;
  const finalizados = useMemo(() => (simulados ?? []).filter((s) => s.statusSimulado === 'FINALIZADO'), [simulados]);
  const emAndamentoOuPausados = useMemo(
    () => (simulados ?? []).filter((s) => s.statusSimulado === 'EM_ANDAMENTO' || s.statusSimulado === 'PAUSADO' || s.statusSimulado === 'CRIADO'),
    [simulados],
  );

  const mediaAproveitamento = useMemo(() => {
    if (finalizados.length === 0) return 0;
    let soma = 0;
    let comNota = 0;
    for (const s of finalizados) {
      const qtd = s._count?.questoes ?? 0;
      if (qtd > 0 && s.pontuacaoTotal !== null && s.pontuacaoTotal !== undefined) {
        soma += (Number(s.pontuacaoTotal) / qtd) * 100;
        comNota += 1;
      }
    }
    return comNota > 0 ? Math.round(soma / comNota) : 0;
  }, [finalizados]);

  // Se o aluno está com a tela de prova aberta, renderiza a execução
  if (simuladoEmExecucao) {
    return (
      <ExecucaoSimulado
        simuladoInicial={simuladoEmExecucao}
        aoVoltar={() => {
          setSimuladoEmExecucao(null);
          recarregar();
        }}
        aoFinalizar={(resultado) => {
          setSimuladoEmExecucao(null);
          setResultadoAtual(resultado);
          setModalResultadoAberto(true);
          recarregar();
        }}
      />
    );
  }

  const colunas: Coluna<SimuladoResumo>[] = [
    {
      chave: 'simulado',
      titulo: 'Simulado',
      celula: (s) => (
        <div className={styles.celulaIdentificacao}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.96rem', color: '#17292d' }}>Simulado #{s.id}</strong>
            <Badge tom={s.tipoSimulado === 'CADERNO_ERROS' ? 'alerta' : 'sucesso'}>
              {s.tipoSimulado === 'CADERNO_ERROS' ? 'Revisão de Erros' : 'Personalizado'}
            </Badge>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#6b7d80' }}>
            Iniciado em {formatarDataHora(s.dataInicio)}
          </span>
        </div>
      ),
    },
    {
      chave: 'questoes',
      titulo: 'Questões',
      alinhamento: 'centro',
      celula: (s) => <strong>{s._count?.questoes ?? 0}</strong>,
    },
    {
      chave: 'tempo',
      titulo: 'Tempo Gasto',
      alinhamento: 'centro',
      celula: (s) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {formatarTempoSegundos(s.tempoGastoSeg ?? s.tempoAcumuladoSeg)}
        </span>
      ),
    },
    {
      chave: 'pontuacao',
      titulo: 'Pontuação / Nota',
      alinhamento: 'centro',
      celula: (s) => {
        if (s.statusSimulado !== 'FINALIZADO' || s.pontuacaoTotal === null || s.pontuacaoTotal === undefined) {
          return <span style={{ color: '#6b7d80' }}>—</span>;
        }
        const total = s._count?.questoes ?? 1;
        const nota = Number(s.pontuacaoTotal);
        const percent = Math.round((nota / total) * 100);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.94rem', color: '#006b70' }}>
              {nota} de {total}
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#6b7d80' }}>({percent}%)</span>
          </div>
        );
      },
    },
    {
      chave: 'status',
      titulo: 'Status',
      alinhamento: 'centro',
      celula: (s) => {
        const nomes: Record<string, string> = {
          FINALIZADO: 'Concluído',
          EM_ANDAMENTO: 'Em Andamento',
          PAUSADO: 'Pausado',
          CRIADO: 'Novo',
        };
        return <Badge tom={tomStatus(s.statusSimulado)}>{nomes[s.statusSimulado] ?? s.statusSimulado}</Badge>;
      },
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (s) => (
        <div className={styles.grupoAcoes}>
          {s.statusSimulado === 'FINALIZADO' ? (
            <Button
              variante="secundario"
              tamanho="sm"
              icone={<Eye size={14} aria-hidden="true" />}
              carregando={carregandoResultado}
              onClick={() => void abrirResultado(s.id)}
            >
              Gabarito
            </Button>
          ) : (
            <Button
              variante="primario"
              tamanho="sm"
              icone={<Play size={14} aria-hidden="true" />}
              carregando={carregandoExecucao}
              onClick={() => void abrirSimulado(s)}
            >
              {s.statusSimulado === 'PAUSADO' ? 'Retomar' : 'Continuar'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Meus Simulados"
        descricao="Pratique com questões de vestibulares oficiais em tempo real, acompanhe o cronômetro e consulte gabaritos comentados."
        acao={
          <Button
            variante="primario"
            icone={<Plus size={16} aria-hidden="true" />}
            onClick={() => setModalNovoAberto(true)}
          >
            Novo Simulado
          </Button>
        }
      />

      {/* Grade de Métricas Rápidas */}
      <div className={styles.gradeMetricas}>
        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <GraduationCap size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Total Gerados</span>
            <span className={styles.valorMetrica}>{totalSimulados}</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica} style={{ background: '#e5f3f1', color: '#006b70' }}>
            <CheckCircle2 size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Simulados Concluídos</span>
            <span className={styles.valorMetrica}>{finalizados.length}</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica} style={{ background: '#fff3c9', color: '#8a5a00' }}>
            <Clock size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Em Andamento / Pausa</span>
            <span className={styles.valorMetrica}>{emAndamentoOuPausados.length}</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica} style={{ background: '#eaf0ef', color: '#17292d' }}>
            <Award size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Média de Acertos</span>
            <span className={styles.valorMetrica}>{mediaAproveitamento}%</span>
          </div>
        </div>
      </div>

      {/* Tabela de Histórico de Simulados */}
      <div className={styles.cartaoTabela}>
        {carregando ? (
          <CarregandoPagina rotulo="Carregando seus simulados..." />
        ) : erro ? (
          <ErrorState mensagem={erro.message} aoTentarNovamente={recarregar} />
        ) : !simulados || simulados.length === 0 ? (
          <EmptyState
            titulo="Nenhum simulado realizado ainda"
            descricao="Crie seu primeiro simulado personalizado com questões de vestibulares selecionadas de acordo com suas metas de estudo."
            acao={
              <Button
                variante="primario"
                icone={<Plus size={16} aria-hidden="true" />}
                onClick={() => setModalNovoAberto(true)}
              >
                Criar Primeiro Simulado
              </Button>
            }
          />
        ) : (
          <Tabela
            colunas={colunas}
            linhas={simulados}
            chaveDaLinha={(s) => s.id}
            descricao="Histórico de simulados e avaliações do aluno"
          />
        )}
      </div>

      {/* Modal de Criação / Configuração do Simulado */}
      <ModalConfigurarSimulado
        aberto={modalNovoAberto}
        aoFechar={() => setModalNovoAberto(false)}
        assuntosDisponiveis={assuntos}
        aoSimuladoCriado={(novoSimulado) => {
          setSimuladoEmExecucao(novoSimulado);
          recarregar();
        }}
      />

      {/* Modal de Exibição de Gabarito e Resultado */}
      <ResultadoSimuladoModal
        aberto={modalResultadoAberto}
        aoFechar={() => setModalResultadoAberto(false)}
        resultado={resultadoAtual}
      />
    </>
  );
}
