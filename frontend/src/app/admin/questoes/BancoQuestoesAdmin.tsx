
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  FileQuestion,
  Image as ImageIcon,
  Plus,
  Power,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { mensagemDeErro } from '@/lib/erros';
import { questoesService } from '@/services/questoes';
import type { FiltroQuestoes, Questao, RespostaQuestoesPaginadas } from '@/types/simulados';
import { GestaoAssuntosModal } from './GestaoAssuntosModal';
import { ModalDetalheQuestao } from './ModalDetalheQuestao';
import { ModalFormQuestao } from './ModalFormQuestao';
import styles from './BancoQuestoesAdmin.module.scss';

function tomDificuldade(dificuldade: string): TomDoBadge {
  switch (dificuldade?.toUpperCase()) {
    case 'FACIL':
      return 'sucesso';
    case 'MEDIA':
      return 'alerta';
    case 'DIFICIL':
      return 'perigo';
    default:
      return 'neutro';
  }
}

export function BancoQuestoesAdmin() {
  const toast = useToast();

  // Estados de Filtro
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [filtroVestibular, setFiltroVestibular] = useState('TODOS');
  const [filtroAno, setFiltroAno] = useState('TODOS');
  const [filtroDificuldade, setFiltroDificuldade] = useState('TODAS');
  const [filtroAssunto, setFiltroAssunto] = useState('TODOS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [pagina, setPagina] = useState(1);
  const limite = 15;

  // Debounce busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [busca]);

  // Carrega lista de assuntos para os selects e tags
  const { dados: assuntosRaw, recarregar: recarregarAssuntos } = useBuscar((signal) =>
    questoesService.listarAssuntos(signal),
  );
  const assuntos = assuntosRaw ?? [];

  // Query das questões paginadas
  const [resposta, setResposta] = useState<RespostaQuestoesPaginadas | null>(null);
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(true);
  const [erroQuestoes, setErroQuestoes] = useState<string | null>(null);

  // Lista global de anos cadastrados no banco
  const [anosCadastrados, setAnosCadastrados] = useState<number[]>([]);

  const carregarAnos = useCallback(async () => {
    try {
      const anos = await questoesService.listarAnos();
      setAnosCadastrados(anos);
    } catch {
      // Tratamento silencioso
    }
  }, []);

  useEffect(() => {
    void carregarAnos();
  }, [carregarAnos]);

  const buscarQuestoes = useCallback(async () => {
    setCarregandoQuestoes(true);
    setErroQuestoes(null);
    try {
      const filtro: FiltroQuestoes = {
        pagina,
        limite,
        busca: buscaDebounced || undefined,
        vestibular: filtroVestibular !== 'TODOS' ? filtroVestibular : undefined,
        ano: filtroAno !== 'TODOS' ? Number(filtroAno) : undefined,
        grauDificuldade: filtroDificuldade !== 'TODAS' ? filtroDificuldade : undefined,
        idAssunto: filtroAssunto !== 'TODOS' ? Number(filtroAssunto) : undefined,
        status: filtroStatus !== 'TODOS' ? filtroStatus : undefined,
      };
      const res = await questoesService.listar(filtro);
      setResposta(res);
    } catch (err) {
      setErroQuestoes(mensagemDeErro(err));
    } finally {
      setCarregandoQuestoes(false);
    }
  }, [pagina, buscaDebounced, filtroVestibular, filtroAno, filtroDificuldade, filtroAssunto, filtroStatus]);

  useEffect(() => {
    void buscarQuestoes();
  }, [buscarQuestoes]);

  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [questaoEditando, setQuestaoEditando] = useState<Questao | null>(null);

  const [modalAssuntosAberto, setModalAssuntosAberto] = useState(false);

  const [modalDetalheAberto, setModalDetalheAberto] = useState(false);
  const [questaoDetalhando, setQuestaoDetalhando] = useState<Questao | null>(null);

  const [questaoParaExcluir, setQuestaoParaExcluir] = useState<Questao | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Ações de ativação / inativação
  const [idAlterandoStatus, setIdAlterandoStatus] = useState<number | null>(null);

  async function alternarStatus(questao: Questao) {
    setIdAlterandoStatus(questao.id);
    try {
      if (questao.status === 'ATIVA') {
        await questoesService.inativar(questao.id);
        toast.sucesso(`Questão #${questao.id} inativada.`);
      } else {
        await questoesService.ativar(questao.id);
        toast.sucesso(`Questão #${questao.id} ativada.`);
      }
      void buscarQuestoes();
    } catch (err) {
      toast.erro(mensagemDeErro(err));
    } finally {
      setIdAlterandoStatus(null);
    }
  }

  async function confirmarExclusao() {
    if (!questaoParaExcluir) return;
    setExcluindo(true);
    try {
      await questoesService.excluir(questaoParaExcluir.id);
      toast.sucesso('Questão excluída com sucesso!');
      setQuestaoParaExcluir(null);
      void buscarQuestoes();
      void carregarAnos();
    } catch (err) {
      toast.erro(mensagemDeErro(err));
    } finally {
      setExcluindo(false);
    }
  }

  function abrirNovoFormulario() {
    setQuestaoEditando(null);
    setModalFormAberto(true);
  }

  function abrirEdicao(questao: Questao) {
    setQuestaoEditando(questao);
    setModalFormAberto(true);
  }

  function abrirDetalhe(questao: Questao) {
    setQuestaoDetalhando(questao);
    setModalDetalheAberto(true);
  }

  // Métricas
  const totalGeral = resposta?.total ?? 0;
  const vestibularesContagem = useMemo(() => {
    const sets = new Set((resposta?.itens ?? []).map((q) => q.vestibular));
    return sets.size;
  }, [resposta?.itens]);

  const colunas: Coluna<Questao>[] = [
    {
      chave: 'questao',
      titulo: 'Questão e Enunciado',
      celula: (q) => (
        <div className={styles.celulaQuestao}>
          <div className={styles.tagsQuestao}>
            <Badge tom="sucesso">{q.vestibular}</Badge>
            <Badge tom="neutro">{q.ano}</Badge>
            {q.numeroQuestao && <Badge tom="neutro">#{q.numeroQuestao}</Badge>}
            <Badge tom={tomDificuldade(q.grauDificuldade)}>{q.grauDificuldade}</Badge>
          </div>
          <p className={styles.enunciadoTrecho}>{q.enunciado}</p>
        </div>
      ),
    },
    {
      chave: 'assuntos',
      titulo: 'Assuntos',
      celula: (q) => (
        <div className={styles.tagsQuestao}>
          {q.assuntos && q.assuntos.length > 0 ? (
            q.assuntos.map((v, i) => {
              const nome = 'assunto' in v && v.assunto ? v.assunto.nomeAssunto : ('nomeAssunto' in v ? String(v.nomeAssunto) : '');
              return (
                <span
                  key={i}
                  style={{
                    fontSize: '0.75rem',
                    background: '#eaf0ef',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    color: '#17292d',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <Tag size={10} aria-hidden="true" />
                  {nome}
                </span>
              );
            })
          ) : (
            <span style={{ color: '#6b7d80', fontSize: '0.82rem' }}>—</span>
          )}
        </div>
      ),
    },
    {
      chave: 'imagem',
      titulo: 'Imagem',
      alinhamento: 'centro',
      celula: (q) =>
        q.imagemUrl ? (
          <span title="Possui imagem no Cloudinary" style={{ color: '#006b70', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 500 }}>
            <ImageIcon size={16} aria-hidden="true" /> Sim
          </span>
        ) : (
          <span style={{ color: '#6b7d80', fontSize: '0.85rem' }}>—</span>
        ),
    },
    {
      chave: 'status',
      titulo: 'Status',
      alinhamento: 'centro',
      celula: (q) => (
        <Badge tom={q.status === 'ATIVA' ? 'sucesso' : 'alerta'}>
          {q.status === 'ATIVA' ? 'Ativa' : 'Inativa'}
        </Badge>
      ),
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (q) => (
        <div className={styles.grupoAcoes}>
          <Button
            variante="secundario"
            tamanho="sm"
            icone={<Eye size={14} aria-hidden="true" />}
            onClick={() => abrirDetalhe(q)}
            title="Visualizar questão completa"
          >
            Ver
          </Button>
          <Button
            variante="secundario"
            tamanho="sm"
            icone={<Edit2 size={14} aria-hidden="true" />}
            onClick={() => abrirEdicao(q)}
            title="Editar questão"
          >
            Editar
          </Button>
          <Button
            variante={q.status === 'ATIVA' ? 'secundario' : 'primario'}
            tamanho="sm"
            icone={<Power size={14} aria-hidden="true" />}
            carregando={idAlterandoStatus === q.id}
            onClick={() => void alternarStatus(q)}
            title={q.status === 'ATIVA' ? 'Inativar questão' : 'Ativar questão'}
          >
            {q.status === 'ATIVA' ? 'Inativar' : 'Ativar'}
          </Button>
          <Button
            variante="perigo"
            tamanho="sm"
            icone={<Trash2 size={14} aria-hidden="true" />}
            onClick={() => setQuestaoParaExcluir(q)}
            title="Excluir questão"
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Banco de Questões"
        descricao="Gestão do acervo de questões de vestibulares com suporte a alternativas e tópicos temáticos."
        acao={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variante="secundario"
              icone={<Tag size={16} aria-hidden="true" />}
              onClick={() => setModalAssuntosAberto(true)}
            >
              Gerenciar Assuntos
            </Button>
            <Button
              variante="primario"
              icone={<Plus size={16} aria-hidden="true" />}
              onClick={abrirNovoFormulario}
            >
              Nova Questão
            </Button>
          </div>
        }
      />

      {/* Métricas Rápidas */}
      <div className={styles.gradeMetricas}>
        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <FileQuestion size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Total no Banco</span>
            <span className={styles.valorMetrica}>{totalGeral}</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica} style={{ background: '#e5f3f1', color: '#006b70' }}>
            <CheckCircle size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Página Atual</span>
            <span className={styles.valorMetrica}>
              {resposta?.pagina ?? 1} / {resposta?.totalPaginas || 1}
            </span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica} style={{ background: '#fff3c9', color: '#8a5a00' }}>
            <BookOpen size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Assuntos Cadastrados</span>
            <span className={styles.valorMetrica}>{assuntos.length}</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica} style={{ background: '#eaf0ef', color: '#17292d' }}>
            <Sparkles size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Vestibulares</span>
            <span className={styles.valorMetrica}>{vestibularesContagem || '3+'}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <section className={styles.barraFiltros}>
        <div className={styles.linhaSuperiorFiltros}>
          <div className={styles.buscaTexto}>
            <Input
              rotulo="Buscar por texto no enunciado"
              placeholder="Digite termos do enunciado para filtrar..."
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          {(busca || filtroVestibular !== 'TODOS' || filtroAno !== 'TODOS' || filtroDificuldade !== 'TODAS' || filtroAssunto !== 'TODOS' || filtroStatus !== 'TODOS') && (
            <Button
              variante="secundario"
              icone={<RotateCcw size={14} aria-hidden="true" />}
              onClick={() => {
                setBusca('');
                setFiltroVestibular('TODOS');
                setFiltroAno('TODOS');
                setFiltroDificuldade('TODAS');
                setFiltroAssunto('TODOS');
                setFiltroStatus('TODOS');
                setPagina(1);
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className={styles.gradeSelectsFiltro}>
          <Select
            rotulo="Vestibular"
            value={filtroVestibular}
            onChange={(e) => {
              setFiltroVestibular(e.target.value);
              setPagina(1);
            }}
          >
            <option value="TODOS">Todos os Vestibulares</option>
            <option value="ENEM">ENEM</option>
            <option value="FUVEST">FUVEST</option>
            <option value="UNICAMP">UNICAMP</option>
          </Select>

          <Select
            rotulo="Ano"
            value={filtroAno}
            onChange={(e) => {
              setFiltroAno(e.target.value);
              setPagina(1);
            }}
          >
            <option value="TODOS">Todos os Anos</option>
            {anosCadastrados.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </Select>

          <Select
            rotulo="Dificuldade"
            value={filtroDificuldade}
            onChange={(e) => {
              setFiltroDificuldade(e.target.value);
              setPagina(1);
            }}
          >
            <option value="TODAS">Todas as Dificuldades</option>
            <option value="FACIL">Fácil</option>
            <option value="MEDIA">Média</option>
            <option value="DIFICIL">Difícil</option>
          </Select>

          <Select
            rotulo="Assunto / Tópico"
            value={filtroAssunto}
            onChange={(e) => {
              setFiltroAssunto(e.target.value);
              setPagina(1);
            }}
          >
            <option value="TODOS">Todos os Assuntos</option>
            {assuntos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nomeAssunto} ({a._count?.questoes ?? 0})
              </option>
            ))}
          </Select>

          <Select
            rotulo="Status"
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPagina(1);
            }}
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVA">Ativas</option>
            <option value="INATIVA">Inativas</option>
          </Select>
        </div>
      </section>

      {/* Tabela de Dados */}
      <div className={styles.cartaoTabela}>
        {carregandoQuestoes ? (
          <CarregandoPagina rotulo="Carregando questões do acervo..." />
        ) : erroQuestoes ? (
          <ErrorState mensagem={erroQuestoes} aoTentarNovamente={buscarQuestoes} />
        ) : !resposta?.itens || resposta.itens.length === 0 ? (
          <EmptyState
            titulo="Nenhuma questão encontrada"
            descricao="Nenhuma questão corresponde aos filtros selecionados. Tente ajustar os termos ou cadastre uma nova questão."
            acao={
              <Button variante="primario" icone={<Plus size={16} aria-hidden="true" />} onClick={abrirNovoFormulario}>
                Cadastrar Questão
              </Button>
            }
          />
        ) : (
          <>
            <Tabela
              colunas={colunas}
              linhas={resposta.itens}
              chaveDaLinha={(q) => q.id}
              descricao="Listagem de questões cadastradas no banco de itens"
            />

            {/* Paginação */}
            <div className={styles.paginacao}>
              <span className={styles.infoPaginacao}>
                Mostrando {(resposta.pagina - 1) * resposta.limite + 1} a{' '}
                {Math.min(resposta.pagina * resposta.limite, resposta.total)} de {resposta.total} questão(ões)
              </span>

              <div className={styles.controlesPaginacao}>
                <Button
                  variante="secundario"
                  tamanho="sm"
                  icone={<ChevronLeft size={16} aria-hidden="true" />}
                  disabled={resposta.pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, padding: '0 8px' }}>
                  {resposta.pagina} / {resposta.totalPaginas || 1}
                </span>
                <Button
                  variante="secundario"
                  tamanho="sm"
                  icone={<ChevronRight size={16} aria-hidden="true" />}
                  disabled={resposta.pagina >= resposta.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Formulário (Criar / Editar) */}
      <ModalFormQuestao
        aberto={modalFormAberto}
        aoFechar={() => setModalFormAberto(false)}
        questaoParaEditar={questaoEditando}
        assuntosDisponiveis={assuntos}
        questoesExistentes={resposta?.itens || []}
        aoAbrirGestaoAssuntos={() => setModalAssuntosAberto(true)}
        aoSucesso={() => {
          void buscarQuestoes();
          void carregarAnos();
          recarregarAssuntos();
        }}
      />

      {/* Modal de Gestão de Assuntos */}
      <GestaoAssuntosModal
        aberto={modalAssuntosAberto}
        aoFechar={() => setModalAssuntosAberto(false)}
        assuntos={assuntos}
        aoAtualizar={() => {
          recarregarAssuntos();
          void buscarQuestoes();
        }}
      />

      {/* Modal de Detalhes da Questão */}
      <ModalDetalheQuestao
        aberto={modalDetalheAberto}
        aoFechar={() => setModalDetalheAberto(false)}
        questao={questaoDetalhando}
        aoEditar={(q) => abrirEdicao(q)}
      />

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        aberto={!!questaoParaExcluir}
        aoFechar={() => setQuestaoParaExcluir(null)}
        titulo="Excluir Questão?"
        rodape={
          <>
            <Button variante="secundario" onClick={() => setQuestaoParaExcluir(null)} disabled={excluindo}>
              Cancelar
            </Button>
            <Button variante="perigo" carregando={excluindo} onClick={() => void confirmarExclusao()}>
              Confirmar Exclusão
            </Button>
          </>
        }
      >
        <p style={{ lineHeight: 1.5, color: '#17292d' }}>
          Deseja realmente excluir a questão <strong>#{questaoParaExcluir?.id}</strong> (
          {questaoParaExcluir?.vestibular} {questaoParaExcluir?.ano})?
        </p>
        <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#6b7d80' }}>
          Nota: Se esta questão já foi respondida em simulados finalizados por alunos, o sistema impedirá a exclusão
          física para preservar o histórico pedagógico. Nesse caso, você poderá inativá-la.
        </p>
      </Modal>
    </>
  );
}
