'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Edit2, Eye, Plus, Sparkles, Trash2, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSessao } from '@/components/layout/SessaoProvider';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select, Textarea } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { temasService, type DadosDeTema } from '@/services/temas';
import type { Tema } from '@/types/redacoes';
import styles from './TemasTutor.module.scss';

type JanelaTema =
  | { tipo: 'novo' }
  | { tipo: 'editar'; tema: Tema }
  | { tipo: 'detalhes'; tema: Tema }
  | { tipo: 'excluir'; tema: Tema }
  | null;

export function TemasTutor() {
  const toast = useToast();
  const { estado } = useSessao();
  const idUsuarioLogado = estado.situacao === 'ok' ? estado.sessao.usuario.id : null;

  const { dados: temas, carregando, erro, recarregar } = useBuscar((signal) => temasService.listar(signal));

  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<'todos' | 'meus' | 'oficiais'>('todos');
  const [janela, setJanela] = useState<JanelaTema>(null);

  // Estados de formulário (criar/editar)
  const [titulo, setTitulo] = useState('');
  const [textoMotivador, setTextoMotivador] = useState('');
  const [erroTitulo, setErroTitulo] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const ehMeuTema = (tema: Tema) => {
    if (tema.origem !== 'TUTOR') return false;
    if (tema.idCriador === null) return true;
    return idUsuarioLogado !== null && tema.idCriador === idUsuarioLogado;
  };

  const listaFiltrada = useMemo(() => {
    if (!temas) return [];
    return temas.filter((t) => {
      const matchBusca =
        !busca.trim() ||
        t.tituloTema.toLowerCase().includes(busca.toLowerCase().trim()) ||
        (t.textoMotivador && t.textoMotivador.toLowerCase().includes(busca.toLowerCase().trim()));

      if (!matchBusca) return false;

      const meu = ehMeuTema(t);
      if (filtroOrigem === 'meus') return meu;
      if (filtroOrigem === 'oficiais') return !meu;
      return true;
    });
  }, [temas, busca, filtroOrigem, idUsuarioLogado]);

  // Métricas
  const totalTemas = temas?.length ?? 0;
  const meusTemasTotal = (temas ?? []).filter(ehMeuTema).length;
  const oficiaisTotal = totalTemas - meusTemasTotal;

  function abrirCriacao() {
    setTitulo('');
    setTextoMotivador('');
    setErroTitulo(undefined);
    setErroGeral(null);
    setJanela({ tipo: 'novo' });
  }

  function abrirEdicao(tema: Tema) {
    setTitulo(tema.tituloTema);
    setTextoMotivador(tema.textoMotivador ?? '');
    setErroTitulo(undefined);
    setErroGeral(null);
    setJanela({ tipo: 'editar', tema });
  }

  function fecharJanela() {
    setJanela(null);
    setErroGeral(null);
    setErroTitulo(undefined);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      setErroTitulo('O título do tema é obrigatório.');
      return;
    }
    if (tituloLimpo.length > 200) {
      setErroTitulo('O título deve ter no máximo 200 caracteres.');
      return;
    }

    setSalvando(true);
    setErroGeral(null);

    const dadosPayload: DadosDeTema = {
      tituloTema: tituloLimpo,
      textoMotivador: textoMotivador.trim() ? textoMotivador.trim() : undefined,
    };

    try {
      if (janela?.tipo === 'novo') {
        await temasService.criar(dadosPayload);
        toast.sucesso('Tema criado com sucesso!');
      } else if (janela?.tipo === 'editar') {
        await temasService.atualizar(janela.tema.id, dadosPayload);
        toast.sucesso('Tema atualizado com sucesso!');
      }
      fecharJanela();
      recarregar();
    } catch (err) {
      if (err instanceof ApiError && err.detalhes.length > 0) {
        setErroGeral(err.detalhes.map((d) => d.mensagem).join(' '));
      } else {
        setErroGeral(mensagemDeErro(err));
      }
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao(tema: Tema) {
    setExcluindo(true);
    setErroGeral(null);
    try {
      await temasService.excluir(tema.id);
      toast.sucesso('Tema excluído com sucesso!');
      fecharJanela();
      recarregar();
    } catch (err) {
      if (err instanceof ApiError && err.codigo === 'TEMA_EM_USO') {
        setErroGeral('Não é possível excluir este tema pois ele já está vinculado a tarefas ou redações.');
      } else {
        setErroGeral(mensagemDeErro(err));
      }
    } finally {
      setExcluindo(false);
    }
  }

  const colunas: Coluna<Tema>[] = [
    {
      chave: 'titulo',
      titulo: 'Título do Tema',
      celula: (t) => (
        <div className={styles.celulaTitulo}>
          <strong>{t.tituloTema}</strong>
          {t.textoMotivador && <span className={styles.previaTexto}>{t.textoMotivador}</span>}
        </div>
      ),
    },
    {
      chave: 'origem',
      titulo: 'Origem',
      celula: (t) => {
        const meu = ehMeuTema(t);
        return (
          <Badge tom={meu ? 'sucesso' : 'neutro'}>
            {meu ? 'Criado por você' : t.origem || 'Oficial'}
          </Badge>
        );
      },
    },
    {
      chave: 'tarefas',
      titulo: 'Tarefas',
      alinhamento: 'centro',
      celula: (t) => t._count?.tarefas ?? 0,
    },
    {
      chave: 'redacoes',
      titulo: 'Redações',
      alinhamento: 'centro',
      celula: (t) => t._count?.redacoes ?? 0,
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (t) => {
        const meu = ehMeuTema(t);
        return (
          <div className={styles.grupoAcoes}>
            <Button
              variante="secundario"
              tamanho="sm"
              icone={<Eye size={15} aria-hidden="true" />}
              onClick={() => setJanela({ tipo: 'detalhes', tema: t })}
            >
              Detalhes
            </Button>
            {meu && (
              <>
                <Button
                  variante="secundario"
                  tamanho="sm"
                  icone={<Edit2 size={15} aria-hidden="true" />}
                  onClick={() => abrirEdicao(t)}
                >
                  Editar
                </Button>
                <Button
                  variante="perigo"
                  tamanho="sm"
                  icone={<Trash2 size={15} aria-hidden="true" />}
                  onClick={() => {
                    setErroGeral(null);
                    setJanela({ tipo: 'excluir', tema: t });
                  }}
                >
                  Excluir
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Banco de Temas"
        descricao="Consulte os temas oficiais e cadastre propostas personalizadas para as tarefas do seu grupo."
        acao={
          <Button icone={<Plus size={18} aria-hidden="true" />} onClick={abrirCriacao}>
            Novo tema
          </Button>
        }
      />

      {/* Grade de Métricas */}
      <div className={styles.gradeMetricas}>
        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <BookOpen size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Total Disponível</span>
            <span className={styles.valorMetrica}>{totalTemas}</span>
            <span className={styles.subMetrica}>Temas no acervo</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <User size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Meus Temas</span>
            <span className={styles.valorMetrica}>{meusTemasTotal}</span>
            <span className={styles.subMetrica}>Cadastrados por você</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <Sparkles size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Temas Oficiais</span>
            <span className={styles.valorMetrica}>{oficiaisTotal}</span>
            <span className={styles.subMetrica}>Disponibilizados pela plataforma</span>
          </div>
        </div>
      </div>

      {/* Barra de Ferramentas e Filtros */}
      <div className={styles.barraFerramentas}>
        <div className={styles.grupoFiltros}>
          <div className={styles.busca}>
            <Input
              rotulo="Buscar tema"
              ocultarRotulo
              type="search"
              placeholder="Buscar por título ou proposta..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className={styles.filtroOrigem}>
            <Select
              rotulo="Origem do tema"
              ocultarRotulo
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value as 'todos' | 'meus' | 'oficiais')}
            >
              <option value="todos">Todos os temas</option>
              <option value="meus">Meus temas ({meusTemasTotal})</option>
              <option value="oficiais">Temas oficiais ({oficiaisTotal})</option>
            </Select>
          </div>
        </div>

        <div className={styles.contadores}>
          {!carregando && !erro && (
            <span className={styles.contagem}>
              {listaFiltrada.length} {listaFiltrada.length === 1 ? 'tema encontrado' : 'temas encontrados'}
            </span>
          )}
        </div>
      </div>

      {carregando ? (
        <CarregandoPagina rotulo="Carregando o banco de temas..." />
      ) : erro ? (
        <ErrorState mensagem={erro.message} conexao={erro.ehErroDeConexao} aoTentarNovamente={recarregar} />
      ) : listaFiltrada.length === 0 ? (
        <EmptyState
          titulo={busca || filtroOrigem !== 'todos' ? 'Nenhum tema encontrado' : 'Nenhum tema cadastrado'}
          descricao={
            busca || filtroOrigem !== 'todos'
              ? 'Tente ajustar os filtros ou a busca textual.'
              : 'Clique em "Novo tema" para cadastrar seu primeiro tema de redação.'
          }
        />
      ) : (
        <Tabela
          colunas={colunas}
          linhas={listaFiltrada}
          chaveDaLinha={(t) => t.id}
          descricao="Lista de temas disponíveis para redações e tarefas"
        />
      )}

      {/* Modal Criar / Editar Tema */}
      <Modal
        aberto={janela?.tipo === 'novo' || janela?.tipo === 'editar'}
        aoFechar={fecharJanela}
        titulo={janela?.tipo === 'novo' ? 'Novo Tema de Redação' : 'Editar Tema'}
      >
        <form className={styles.formulario} onSubmit={salvar} noValidate>
          {erroGeral && <Alerta tom="erro">{erroGeral}</Alerta>}

          <Input
            rotulo="Título da Proposta de Redação"
            placeholder="Ex.: Caminhos para combater a intolerância religiosa no Brasil"
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              if (erroTitulo) setErroTitulo(undefined);
            }}
            maxLength={200}
            erro={erroTitulo}
            dica="Título claro e conciso (máximo 200 caracteres)."
            required
          />

          <Textarea
            rotulo="Texto Motivador / Coletânea (opcional)"
            placeholder="Insira o texto motivador, dados estatísticos, excertos de leis ou orientações para a produção textual..."
            value={textoMotivador}
            onChange={(e) => setTextoMotivador(e.target.value)}
            maxLength={10000}
            rows={6}
            dica="Texto de apoio para os alunos elaborarem a redação (até 10.000 caracteres)."
          />

          <div className={styles.botoesModal}>
            <Button variante="secundario" onClick={fecharJanela} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" carregando={salvando}>
              {janela?.tipo === 'novo' ? 'Cadastrar Tema' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalhes do Tema */}
      <Modal
        aberto={janela?.tipo === 'detalhes'}
        aoFechar={fecharJanela}
        titulo={janela?.tipo === 'detalhes' ? janela.tema.tituloTema : 'Detalhes do Tema'}
      >
        {janela?.tipo === 'detalhes' && (
          <div className={styles.detalhesTema}>
            <div className={styles.cabecalhoDetalhes}>
              <div className={styles.metaDetalhe}>
                <span>Origem:</span>
                <Badge tom={ehMeuTema(janela.tema) ? 'sucesso' : 'neutro'}>
                  {ehMeuTema(janela.tema) ? 'Criado por você' : janela.tema.origem || 'Oficial'}
                </Badge>
              </div>
              <div className={styles.estatisticasUso}>
                <span>
                  Tarefas vinculadas: <strong>{janela.tema._count?.tarefas ?? 0}</strong>
                </span>
                <span>
                  Redações submetidas: <strong>{janela.tema._count?.redacoes ?? 0}</strong>
                </span>
              </div>
            </div>

            <div className={styles.blocoMotivador}>
              <h4>Texto Motivador e Coletânea</h4>
              {janela.tema.textoMotivador ? (
                <p>{janela.tema.textoMotivador}</p>
              ) : (
                <p style={{ color: 'var(--cor-texto-suave, #6b7d80)', fontStyle: 'italic' }}>
                  Nenhum texto motivador cadastrado para este tema.
                </p>
              )}
            </div>

            <div className={styles.botoesModal}>
              {ehMeuTema(janela.tema) && (
                <Button
                  variante="secundario"
                  icone={<Edit2 size={16} />}
                  onClick={() => janela?.tipo === 'detalhes' && abrirEdicao(janela.tema)}
                >
                  Editar tema
                </Button>
              )}
              <Button onClick={fecharJanela}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Excluir Tema */}
      <Modal
        aberto={janela?.tipo === 'excluir'}
        aoFechar={fecharJanela}
        titulo="Excluir Tema?"
        rodape={
          <>
            <Button variante="secundario" disabled={excluindo} onClick={fecharJanela}>
              Cancelar
            </Button>
            <Button
              variante="perigo"
              carregando={excluindo}
              onClick={() => janela?.tipo === 'excluir' && void confirmarExclusao(janela.tema)}
            >
              Excluir definitivamente
            </Button>
          </>
        }
      >
        {janela?.tipo === 'excluir' && (
          <div className={styles.formulario}>
            {erroGeral && <Alerta tom="erro">{erroGeral}</Alerta>}
            <p>
              Você está prestes a excluir o tema <strong>{janela.tema.tituloTema}</strong>.
            </p>
            {((janela.tema._count?.tarefas ?? 0) > 0 || (janela.tema._count?.redacoes ?? 0) > 0) && (
              <Alerta tom="alerta">
                Este tema possui <strong>{janela.tema._count?.tarefas ?? 0} tarefa(s)</strong> e{' '}
                <strong>{janela.tema._count?.redacoes ?? 0} redação(ões)</strong> associadas. O sistema não permite
                excluir temas em uso.
              </Alerta>
            )}
            <p>Esta ação é irreversível.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
