'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Edit2, Eye, Plus, Sparkles, Trash2, UserCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
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
import styles from './TemasAdmin.module.scss';

type JanelaTema =
  | { tipo: 'novo' }
  | { tipo: 'editar'; tema: Tema }
  | { tipo: 'detalhes'; tema: Tema }
  | { tipo: 'excluir'; tema: Tema }
  | null;

const ORIGENS_PRESET = ['OFICIAL', 'ENEM', 'FUVEST', 'UNICAMP', 'UNESP', 'UERJ', 'OUTRO'] as const;

function obterTomOrigem(origem: string | null): TomDoBadge {
  if (!origem) return 'neutro';
  const maiusculo = origem.toUpperCase();
  if (maiusculo === 'OFICIAL') return 'sucesso';
  if (maiusculo === 'TUTOR') return 'alerta';
  if (maiusculo === 'ALUNO') return 'neutro';
  return 'sucesso';
}

export function TemasAdmin() {
  const toast = useToast();
  const { dados: temas, carregando, erro, recarregar } = useBuscar((signal) => temasService.listar(signal));

  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos');
  const [janela, setJanela] = useState<JanelaTema>(null);

  // Estados de formulário
  const [titulo, setTitulo] = useState('');
  const [origemSelect, setOrigemSelect] = useState<string>('OFICIAL');
  const [origemCustom, setOrigemCustom] = useState('');
  const [textoMotivador, setTextoMotivador] = useState('');
  const [erroTitulo, setErroTitulo] = useState<string | undefined>();
  const [erroOrigem, setErroOrigem] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Métricas
  const totalTemas = temas?.length ?? 0;
  const oficiaisTotal = (temas ?? []).filter((t) => (t.origem || 'OFICIAL').toUpperCase() === 'OFICIAL').length;
  const tutoresTotal = (temas ?? []).filter((t) => (t.origem || '').toUpperCase() === 'TUTOR').length;
  const alunosTotal = (temas ?? []).filter((t) => (t.origem || '').toUpperCase() === 'ALUNO').length;

  const listaFiltrada = useMemo(() => {
    if (!temas) return [];
    return temas.filter((t) => {
      const termo = busca.toLowerCase().trim();
      const matchBusca =
        !termo ||
        t.tituloTema.toLowerCase().includes(termo) ||
        (t.textoMotivador && t.textoMotivador.toLowerCase().includes(termo)) ||
        (t.origem && t.origem.toLowerCase().includes(termo));

      if (!matchBusca) return false;

      if (filtroOrigem !== 'todos') {
        const o = (t.origem || 'OFICIAL').toUpperCase();
        if (filtroOrigem === 'OFICIAL' && o !== 'OFICIAL') return false;
        if (filtroOrigem === 'TUTOR' && o !== 'TUTOR') return false;
        if (filtroOrigem === 'ALUNO' && o !== 'ALUNO') return false;
        if (filtroOrigem === 'VESTIBULARES' && ['OFICIAL', 'TUTOR', 'ALUNO'].includes(o)) return false;
      }

      return true;
    });
  }, [temas, busca, filtroOrigem]);

  function abrirCriacao() {
    setTitulo('');
    setOrigemSelect('OFICIAL');
    setOrigemCustom('');
    setTextoMotivador('');
    setErroTitulo(undefined);
    setErroOrigem(undefined);
    setErroGeral(null);
    setJanela({ tipo: 'novo' });
  }

  function abrirEdicao(tema: Tema) {
    setTitulo(tema.tituloTema);
    setTextoMotivador(tema.textoMotivador ?? '');
    const o = tema.origem || 'OFICIAL';
    if (ORIGENS_PRESET.includes(o as (typeof ORIGENS_PRESET)[number])) {
      setOrigemSelect(o);
      setOrigemCustom('');
    } else {
      setOrigemSelect('OUTRO');
      setOrigemCustom(o);
    }
    setErroTitulo(undefined);
    setErroOrigem(undefined);
    setErroGeral(null);
    setJanela({ tipo: 'editar', tema });
  }

  function fecharJanela() {
    setJanela(null);
    setErroGeral(null);
    setErroTitulo(undefined);
    setErroOrigem(undefined);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      setErroTitulo('O título da proposta é obrigatório.');
      return;
    }
    if (tituloLimpo.length > 200) {
      setErroTitulo('O título deve ter no máximo 200 caracteres.');
      return;
    }

    let origemFinal = origemSelect === 'OUTRO' ? origemCustom.trim() : origemSelect;
    if (!origemFinal) origemFinal = 'OFICIAL';

    const origemUpper = origemFinal.toUpperCase();
    if (origemUpper === 'TUTOR' || origemUpper === 'ALUNO') {
      setErroOrigem('As origens TUTOR e ALUNO são reservadas exclusivamente pelo sistema.');
      return;
    }
    if (origemFinal.length > 100) {
      setErroOrigem('A origem deve ter até 100 caracteres.');
      return;
    }

    setSalvando(true);
    setErroGeral(null);

    const dadosPayload: DadosDeTema = {
      tituloTema: tituloLimpo,
      origem: origemFinal,
      textoMotivador: textoMotivador.trim() ? textoMotivador.trim() : undefined,
    };

    try {
      if (janela?.tipo === 'novo') {
        await temasService.criar(dadosPayload);
        toast.sucesso('Tema oficial cadastrado com sucesso!');
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
      celula: (t) => <Badge tom={obterTomOrigem(t.origem)}>{t.origem || 'OFICIAL'}</Badge>,
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
      celula: (t) => (
        <div className={styles.grupoAcoes}>
          <Button
            variante="secundario"
            tamanho="sm"
            icone={<Eye size={15} aria-hidden="true" />}
            onClick={() => setJanela({ tipo: 'detalhes', tema: t })}
          >
            Detalhes
          </Button>
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
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Banco de Temas"
        descricao="Cadastre e gerencie temas oficiais e monitore temas criados por tutores e alunos."
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
            <span className={styles.rotuloMetrica}>Total de Temas</span>
            <span className={styles.valorMetrica}>{totalTemas}</span>
            <span className={styles.subMetrica}>No sistema</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <Sparkles size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Oficiais</span>
            <span className={styles.valorMetrica}>{oficiaisTotal}</span>
            <span className={styles.subMetrica}>Administração</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <UserCheck size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>De Tutores</span>
            <span className={styles.valorMetrica}>{tutoresTotal}</span>
            <span className={styles.subMetrica}>Criados por tutores</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <Users size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>De Alunos</span>
            <span className={styles.valorMetrica}>{alunosTotal}</span>
            <span className={styles.subMetrica}>Redações de treino</span>
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
              placeholder="Buscar por título, coletânea ou vestibular..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className={styles.filtroOrigem}>
            <Select
              rotulo="Origem do tema"
              ocultarRotulo
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
            >
              <option value="todos">Todas as origens ({totalTemas})</option>
              <option value="OFICIAL">Oficiais da Administração ({oficiaisTotal})</option>
              <option value="TUTOR">Criados por Tutores ({tutoresTotal})</option>
              <option value="ALUNO">Criados por Alunos ({alunosTotal})</option>
              <option value="VESTIBULARES">Vestibulares / Outros</option>
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
        <CarregandoPagina rotulo="Carregando temas..." />
      ) : erro ? (
        <ErrorState mensagem={erro.message} conexao={erro.ehErroDeConexao} aoTentarNovamente={recarregar} />
      ) : listaFiltrada.length === 0 ? (
        <EmptyState
          titulo={busca || filtroOrigem !== 'todos' ? 'Nenhum tema encontrado' : 'Nenhum tema cadastrado'}
          descricao={
            busca || filtroOrigem !== 'todos'
              ? 'Tente ajustar os filtros ou a busca textual.'
              : 'Clique em "Novo tema" para cadastrar o primeiro tema oficial.'
          }
        />
      ) : (
        <Tabela
          colunas={colunas}
          linhas={listaFiltrada}
          chaveDaLinha={(t) => t.id}
          descricao="Lista de temas cadastrados no sistema"
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
            rotulo="Título da Proposta"
            placeholder="Ex.: Desafios para a valorização de comunidades e povos tradicionais no Brasil"
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              if (erroTitulo) setErroTitulo(undefined);
            }}
            maxLength={200}
            erro={erroTitulo}
            dica="Título oficial do tema (máximo 200 caracteres)."
            required
          />

          <div className={styles.linhaDupla}>
            <Select
              rotulo="Origem / Vestibular"
              value={origemSelect}
              onChange={(e) => {
                setOrigemSelect(e.target.value);
                if (erroOrigem) setErroOrigem(undefined);
              }}
              erro={erroOrigem}
              dica="Identifica a fonte ou banca examinadora."
            >
              <option value="OFICIAL">OFICIAL (Administração LIRA)</option>
              <option value="ENEM">ENEM</option>
              <option value="FUVEST">FUVEST</option>
              <option value="UNICAMP">UNICAMP</option>
              <option value="UNESP">UNESP</option>
              <option value="UERJ">UERJ</option>
              <option value="OUTRO">Outra origem personalizada...</option>
            </Select>

            {origemSelect === 'OUTRO' && (
              <Input
                rotulo="Nome da Origem"
                placeholder="Ex.: ITA, FGV, UFRGS..."
                value={origemCustom}
                onChange={(e) => {
                  setOrigemCustom(e.target.value);
                  if (erroOrigem) setErroOrigem(undefined);
                }}
                maxLength={100}
                erro={erroOrigem}
                dica="TUTOR e ALUNO são origens reservadas."
              />
            )}
          </div>

          <Textarea
            rotulo="Texto Motivador / Coletânea (opcional)"
            placeholder="Insira excertos de textos de apoio, infográficos em texto, citações e orientações da proposta..."
            value={textoMotivador}
            onChange={(e) => setTextoMotivador(e.target.value)}
            maxLength={10000}
            rows={6}
            dica="Texto de apoio aos estudantes (até 10.000 caracteres)."
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
                <Badge tom={obterTomOrigem(janela.tema.origem)}>
                  {janela.tema.origem || 'OFICIAL'}
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
              <Button
                variante="secundario"
                icone={<Edit2 size={16} />}
                onClick={() => janela?.tipo === 'detalhes' && abrirEdicao(janela.tema)}
              >
                Editar tema
              </Button>
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
