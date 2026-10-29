'use client';

import { useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  GraduationCap,
  LayoutGrid,
  Plus,
  Table as TableIcon,
  UserPlus,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select } from '@/components/ui/Campos/Campos';
import { Card } from '@/components/ui/Card/Card';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { mensagemDeErro } from '@/lib/erros';
import { adminService, type TurmaAdmin } from '@/services/admin';
import { ModalConviteTutor } from './ModalConviteTutor';
import { ModalIntegrantesTurma } from './ModalIntegrantesTurma';
import { ModalNovaTurma } from './ModalNovaTurma';
import styles from './TurmasAdmin.module.scss';

type ModoExibicao = 'grade' | 'tabela';

export function TurmasAdmin() {
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVA' | 'ARQUIVADA'>('TODOS');
  const [filtroVestibular, setFiltroVestibular] = useState<string>('TODOS');
  const [modoExibicao, setModoExibicao] = useState<ModoExibicao>('grade');

  // Modais
  const [turmaSelecionada, setTurmaSelecionada] = useState<TurmaAdmin | null>(null);
  const [modalConviteAberto, setModalConviteAberto] = useState(false);
  const [modalNovaTurmaAberto, setModalNovaTurmaAberto] = useState(false);
  const [modalIntegrantesAberto, setModalIntegrantesAberto] = useState(false);
  const [turmaParaArquivar, setTurmaParaArquivar] = useState<TurmaAdmin | null>(null);
  const [arquivando, setArquivando] = useState(false);

  const { dados, carregando, erro, recarregar } = useBuscar((signal) =>
    adminService.turmas(signal)
  );
  const turmas = dados ?? [];

  // Métricas rápidas
  const totalTurmas = turmas.length;
  const turmasAtivas = turmas.filter((t) => t.status === 'ATIVA').length;
  const totalTutores = turmas.reduce((acc, t) => acc + t.totalTutores, 0);
  const totalAlunos = turmas.reduce((acc, t) => acc + t.totalAlunos, 0);

  // Lista filtrada
  const turmasFiltradas = useMemo(() => {
    return turmas.filter((t) => {
      if (busca && !t.nome.toLowerCase().includes(busca.toLowerCase().trim())) {
        return false;
      }
      if (filtroStatus !== 'TODOS' && t.status !== filtroStatus) {
        return false;
      }
      if (filtroVestibular !== 'TODOS' && t.vestibularFoco !== filtroVestibular) {
        return false;
      }
      return true;
    });
  }, [turmas, busca, filtroStatus, filtroVestibular]);

  // Lista de vestibulares únicos presentes para o filtro
  const vestibularesDisponiveis = useMemo(() => {
    const conjunto = new Set(turmas.map((t) => t.vestibularFoco).filter(Boolean));
    return Array.from(conjunto);
  }, [turmas]);

  function abrirConvite(turma: TurmaAdmin) {
    setTurmaSelecionada(turma);
    setModalConviteAberto(true);
  }

  function abrirIntegrantes(turma: TurmaAdmin) {
    setTurmaSelecionada(turma);
    setModalIntegrantesAberto(true);
  }

  async function confirmarArquivamento() {
    if (!turmaParaArquivar) return;
    setArquivando(true);
    try {
      await adminService.arquivarTurma(turmaParaArquivar.id);
      toast.sucesso(`Turma "${turmaParaArquivar.nome}" arquivada com sucesso.`);
      setTurmaParaArquivar(null);
      recarregar();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setArquivando(false);
    }
  }

  const colunas: Coluna<TurmaAdmin>[] = [
    {
      chave: 'nome',
      titulo: 'Turma',
      celula: (t) => (
        <div className={styles.colunaTurma}>
          <strong className={styles.nomeTurmaLinha}>{t.nome}</strong>
          <span className={styles.subtextoLinha}>Ano: {t.anoLetivo}</span>
        </div>
      ),
    },
    {
      chave: 'vestibularFoco',
      titulo: 'Vestibular',
      alinhamento: 'centro',
      celula: (t) => <Badge tom="neutro">{t.vestibularFoco}</Badge>,
    },
    {
      chave: 'status',
      titulo: 'Status',
      alinhamento: 'centro',
      celula: (t) => (
        <Badge tom={t.status === 'ATIVA' ? 'sucesso' : 'alerta'}>
          {t.status}
        </Badge>
      ),
    },
    {
      chave: 'tutores',
      titulo: 'Tutores (Capacidade)',
      alinhamento: 'centro',
      celula: (t) => (
        <span className={styles.capacidadeLinha}>
          <strong>{t.totalTutores}</strong> / 6
        </span>
      ),
    },
    {
      chave: 'alunos',
      titulo: 'Alunos',
      alinhamento: 'centro',
      celula: (t) => <strong>{t.totalAlunos}</strong>,
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (t) => (
        <div className={styles.acoesLinha}>
          <Button
            variante="secundario"
            tamanho="sm"
            icone={<Users size={14} aria-hidden="true" />}
            onClick={() => abrirIntegrantes(t)}
          >
            Integrantes
          </Button>
          <Button
            variante="secundario"
            tamanho="sm"
            icone={<UserPlus size={14} aria-hidden="true" />}
            onClick={() => abrirConvite(t)}
            disabled={t.status !== 'ATIVA' || t.totalTutores >= 6}
          >
            Convidar
          </Button>
          {t.status === 'ATIVA' && (
            <Button
              variante="perigo"
              tamanho="sm"
              icone={<Archive size={14} aria-hidden="true" />}
              onClick={() => setTurmaParaArquivar(t)}
              aria-label={`Arquivar turma ${t.nome}`}
            >
              Arquivar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Gestão de Turmas"
        descricao="Gerencie turmas, capacidade de tutores, remanejamentos e emissão de convites parametrizados."
        acao={
          <Button
            icone={<Plus size={18} aria-hidden="true" />}
            onClick={() => setModalNovaTurmaAberto(true)}
          >
            Nova turma
          </Button>
        }
      />

      {/* Cartões de Indicadores Rápidos */}
      <section className={styles.gradeMetricas} aria-label="Indicadores gerais de turmas">
        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <BookOpen size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Total de Turmas</span>
            <strong className={styles.valorMetrica}>{totalTurmas}</strong>
            <span className={styles.subMetrica}>{turmasAtivas} ativas</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <GraduationCap size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Tutores Vinculados</span>
            <strong className={styles.valorMetrica}>{totalTutores}</strong>
            <span className={styles.subMetrica}>Máximo de 6 por turma</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <Users size={20} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Alunos Cadastrados</span>
            <strong className={styles.valorMetrica}>{totalAlunos}</strong>
            <span className={styles.subMetrica}>Distribuídos nos tutores</span>
          </div>
        </div>
      </section>

      {/* Barra de Filtros e Visualização */}
      <div className={styles.barraFerramentas}>
        <div className={styles.grupoFiltros}>
          <div className={styles.busca}>
            <Input
              rotulo="Buscar turma"
              ocultarRotulo
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome da turma..."
            />
          </div>

          <div className={styles.seletorFiltro}>
            <Select
              rotulo="Status da Turma"
              ocultarRotulo
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as 'TODOS' | 'ATIVA' | 'ARQUIVADA')}
            >
              <option value="TODOS">Todos os status</option>
              <option value="ATIVA">Apenas Ativas</option>
              <option value="ARQUIVADA">Apenas Arquivadas</option>
            </Select>
          </div>

          {vestibularesDisponiveis.length > 0 && (
            <div className={styles.seletorFiltro}>
              <Select
                rotulo="Vestibular"
                ocultarRotulo
                value={filtroVestibular}
                onChange={(e) => setFiltroVestibular(e.target.value)}
              >
                <option value="TODOS">Todos os vestibulares</option>
                {vestibularesDisponiveis.map((vest) => (
                  <option key={vest} value={vest}>
                    {vest}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className={styles.grupoControles}>
          <span className={styles.contagem}>
            {turmasFiltradas.length}{' '}
            {turmasFiltradas.length === 1 ? 'turma encontrada' : 'turmas encontradas'}
          </span>

          <div className={styles.alternadorModo} role="group" aria-label="Modo de visualização">
            <button
              type="button"
              className={modoExibicao === 'grade' ? styles.modoAtivo : styles.modoBotao}
              onClick={() => setModoExibicao('grade')}
              aria-pressed={modoExibicao === 'grade'}
              title="Visualização em grade de cartões"
            >
              <LayoutGrid size={16} aria-hidden="true" />
              <span className={styles.rotuloModo}>Grade</span>
            </button>
            <button
              type="button"
              className={modoExibicao === 'tabela' ? styles.modoAtivo : styles.modoBotao}
              onClick={() => setModoExibicao('tabela')}
              aria-pressed={modoExibicao === 'tabela'}
              title="Visualização em tabela"
            >
              <TableIcon size={16} aria-hidden="true" />
              <span className={styles.rotuloModo}>Tabela</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {carregando ? (
        <CarregandoPagina rotulo="Carregando turmas..." />
      ) : erro ? (
        <ErrorState mensagem={erro.message} conexao={erro.ehErroDeConexao} aoTentarNovamente={recarregar} />
      ) : turmasFiltradas.length === 0 ? (
        <div className={styles.vazio}>
          <EmptyState
            titulo={busca || filtroStatus !== 'TODOS' ? 'Nenhuma turma corresponde aos filtros' : 'Nenhuma turma cadastrada'}
            descricao={
              busca || filtroStatus !== 'TODOS'
                ? 'Tente ajustar ou limpar seus critérios de busca.'
                : 'Clique em "Nova turma" para começar a estruturar sua plataforma.'
            }
          />
        </div>
      ) : modoExibicao === 'grade' ? (
        <div className={styles.gradeTurmas}>
          {turmasFiltradas.map((turma) => {
            const vagasTutores = Math.max(0, 6 - turma.totalTutores);
            return (
              <Card key={turma.id} className={styles.cardTurma}>
                <div className={styles.cabecalhoCardTurma}>
                  <div>
                    <h3 className={styles.tituloCardTurma}>{turma.nome}</h3>
                    <span className={styles.anoCardTurma}>Ano Letivo: {turma.anoLetivo}</span>
                  </div>
                  <Badge tom={turma.status === 'ATIVA' ? 'sucesso' : 'alerta'}>
                    {turma.status}
                  </Badge>
                </div>

                <div className={styles.detalhesCardTurma}>
                  <div className={styles.tagVestibular}>
                    <Badge tom="neutro">{turma.vestibularFoco}</Badge>
                  </div>

                  <div className={styles.blocoCapacidade}>
                    <div className={styles.linhaCapacidade}>
                      <span>Tutores Vinculados:</span>
                      <strong>{turma.totalTutores} / 6</strong>
                    </div>
                    <div
                      className={styles.barraProgresso}
                      role="progressbar"
                      aria-valuenow={turma.totalTutores}
                      aria-valuemin={0}
                      aria-valuemax={6}
                      aria-label={`${turma.totalTutores} de 6 tutores`}
                    >
                      <div
                        className={styles.preenchimentoProgresso}
                        style={{ width: `${(turma.totalTutores / 6) * 100}%` }}
                      />
                    </div>
                    <span className={styles.avisoVagas}>
                      {vagasTutores > 0
                        ? `${vagasTutores} vagas de tutor disponíveis`
                        : 'Limite de 6 tutores atingido'}
                    </span>
                  </div>

                  <div className={styles.blocoAlunos}>
                    <Users size={16} aria-hidden="true" />
                    <span>
                      Total de alunos vinculados: <strong>{turma.totalAlunos}</strong>
                    </span>
                  </div>
                </div>

                <div className={styles.rodapeCardTurma}>
                  <Button
                    variante="secundario"
                    tamanho="sm"
                    icone={<Users size={15} aria-hidden="true" />}
                    onClick={() => abrirIntegrantes(turma)}
                  >
                    Ver integrantes
                  </Button>
                  <Button
                    variante="secundario"
                    tamanho="sm"
                    icone={<UserPlus size={15} aria-hidden="true" />}
                    onClick={() => abrirConvite(turma)}
                    disabled={turma.status !== 'ATIVA' || turma.totalTutores >= 6}
                  >
                    Convidar
                  </Button>
                  {turma.status === 'ATIVA' && (
                    <Button
                      variante="perigo"
                      tamanho="sm"
                      icone={<Archive size={15} aria-hidden="true" />}
                      onClick={() => setTurmaParaArquivar(turma)}
                      aria-label={`Arquivar ${turma.nome}`}
                    >
                      Arquivar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Tabela
          colunas={colunas}
          linhas={turmasFiltradas}
          chaveDaLinha={(t) => t.id}
          descricao="Lista de turmas cadastradas no sistema"
        />
      )}

      {/* Modal Convidar Tutor */}
      <ModalConviteTutor
        turma={turmaSelecionada}
        aberto={modalConviteAberto}
        aoFechar={() => {
          setModalConviteAberto(false);
          setTurmaSelecionada(null);
        }}
        aoSucesso={recarregar}
      />

      {/* Modal Nova Turma */}
      <ModalNovaTurma
        aberto={modalNovaTurmaAberto}
        aoFechar={() => setModalNovaTurmaAberto(false)}
        aoSucesso={recarregar}
      />

      {/* Modal Integrantes e Remanejamento */}
      <ModalIntegrantesTurma
        turma={turmaSelecionada}
        aberto={modalIntegrantesAberto}
        aoFechar={() => {
          setModalIntegrantesAberto(false);
          setTurmaSelecionada(null);
        }}
        aoAbrirConvite={(t) => abrirConvite(t)}
        aoAtualizarTurma={recarregar}
      />

      {/* Modal Confirmar Arquivamento */}
      <Modal
        aberto={Boolean(turmaParaArquivar)}
        aoFechar={() => setTurmaParaArquivar(null)}
        titulo="Confirmar Arquivamento de Turma"
        tamanho="sm"
        rodape={
          <>
            <Button
              variante="secundario"
              onClick={() => setTurmaParaArquivar(null)}
              disabled={arquivando}
            >
              Cancelar
            </Button>
            <Button
              variante="perigo"
              carregando={arquivando}
              onClick={() => void confirmarArquivamento()}
            >
              Arquivar turma
            </Button>
          </>
        }
      >
        <p className={styles.textoInstrucao}>
          Tem certeza de que deseja arquivar a turma{' '}
          <strong>{turmaParaArquivar?.nome}</strong>? Turmas arquivadas deixam de aceitar
          novos convites e novas submissões de redações pelos alunos.
        </p>
      </Modal>
    </>
  );
}
