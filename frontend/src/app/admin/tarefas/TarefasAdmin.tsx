'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  Paperclip,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select, Textarea } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina, Spinner } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/formatar';
import { prazoEncerrado, urlSegura } from '@/lib/redacoes';
import { adminService } from '@/services/admin';
import { uploadArquivoCloudinary } from '@/services/cloudinary';
import { temasService } from '@/services/temas';
import { TextoMotivador } from '@/components/redacao/TextoMotivador';
import type { DadosDeTarefa } from '@/services/tutor';
import type { TarefaDoTutor } from '@/types/correcoes';
import styles from './TarefasAdmin.module.scss';

const NOVO_TEMA = 'novo';
const TIPOS_ANEXO_VALIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const EXTENSOES_VALIDAS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024; // 10 MB

function localParaIso(valor: string): string | null {
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isoParaLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

interface AnexoUploadEstado {
  url: string;
  nomeArquivo: string;
  tipoArquivo: string;
  tamanho: number;
}

type JanelaTarefa =
  | { tipo: 'novo' }
  | { tipo: 'editar'; tarefa: TarefaDoTutor }
  | { tipo: 'anexos'; tarefa: TarefaDoTutor }
  | { tipo: 'detalhes'; tarefa: TarefaDoTutor }
  | { tipo: 'excluir'; tarefa: TarefaDoTutor }
  | null;

export function TarefasAdmin() {
  const toast = useToast();

  const { dados: tarefas, carregando, erro, recarregar } = useBuscar((signal) => adminService.tarefas(signal));
  const { dados: temas } = useBuscar((signal) => temasService.listar(signal));

  const [busca, setBusca] = useState('');
  const [filtroModalidade, setFiltroModalidade] = useState<'GERAL' | 'TODAS'>('GERAL');
  const [janela, setJanela] = useState<JanelaTarefa>(null);

  // Formulário de Criação/Edição
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prazo, setPrazo] = useState('');
  const [temaId, setTemaId] = useState('');
  const [tituloNovoTema, setTituloNovoTema] = useState('');
  const [textoNovoTema, setTextoNovoTema] = useState('');
  const [imagemNovoTema, setImagemNovoTema] = useState('');

  // Erros e Envio
  const [erroTitulo, setErroTitulo] = useState<string | undefined>();
  const [erroPrazo, setErroPrazo] = useState<string | undefined>();
  const [erroTema, setErroTema] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Upload Cloudinary
  const [anexoNovo, setAnexoNovo] = useState<AnexoUploadEstado | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  // Gestão de Anexos no modal de anexos
  const [removendoAnexoId, setRemovendoAnexoId] = useState<number | null>(null);

  // Métricas
  const modelosGerais = (tarefas ?? []).filter((t) => t.modalidade === 'GERAL');
  const totalModelos = modelosGerais.length;
  const modelosReplicados = modelosGerais.filter((t) => (t._count?.tarefasAplicadas ?? 0) > 0).length;
  const totalReplicacoes = modelosGerais.reduce((acc, t) => acc + (t._count?.tarefasAplicadas ?? 0), 0);
  const modelosComAnexos = modelosGerais.filter((t) => t.anexos && t.anexos.length > 0).length;

  const listaFiltrada = useMemo(() => {
    if (!tarefas) return [];
    return tarefas.filter((t) => {
      if (filtroModalidade === 'GERAL' && t.modalidade !== 'GERAL') return false;

      const termo = busca.toLowerCase().trim();
      if (!termo) return true;

      const matchTitulo = t.tituloTarefa.toLowerCase().includes(termo);
      const matchDesc = t.descricao ? t.descricao.toLowerCase().includes(termo) : false;
      const matchTema = t.tema?.tituloTema ? t.tema.tituloTema.toLowerCase().includes(termo) : false;

      return matchTitulo || matchDesc || matchTema;
    });
  }, [tarefas, busca, filtroModalidade]);

  function fecharJanela() {
    setJanela(null);
    setErroGeral(null);
    setErroTitulo(undefined);
    setErroPrazo(undefined);
    setErroTema(undefined);
    setAnexoNovo(null);
    setErroAnexo(null);
    if (arquivoInputRef.current) arquivoInputRef.current.value = '';
  }

  function abrirCriacao() {
    setTitulo('');
    setDescricao('');
    // Sugere prazo padrão: 14 dias no futuro às 23:59
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setHours(23, 59, 0, 0);
    setPrazo(isoParaLocal(d.toISOString()));

    setTemaId('');
    setTituloNovoTema('');
    setTextoNovoTema('');
    setImagemNovoTema('');
    setAnexoNovo(null);
    setErroGeral(null);
    setJanela({ tipo: 'novo' });
  }

  function abrirEdicao(tarefa: TarefaDoTutor) {
    setTitulo(tarefa.tituloTarefa);
    setDescricao(tarefa.descricao ?? '');
    setPrazo(isoParaLocal(tarefa.prazoEntrega));
    setTemaId(tarefa.idTema ? String(tarefa.idTema) : '');
    setTituloNovoTema('');
    setTextoNovoTema('');
    setImagemNovoTema('');
    setAnexoNovo(null);
    setErroGeral(null);
    setJanela({ tipo: 'editar', tarefa });
  }

  async function aoSelecionarArquivoCloudinary(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErroAnexo(null);

    const extensao = '.' + (arquivo.name.split('.').pop()?.toLowerCase() ?? '');
    const tipoMime = arquivo.type.toLowerCase();
    const ehTipoValido = TIPOS_ANEXO_VALIDOS.includes(tipoMime) || EXTENSOES_VALIDAS.includes(extensao);

    if (!ehTipoValido) {
      setErroAnexo('Formato de anexo não permitido. Utilize PDF, PNG, JPG ou WEBP.');
      if (arquivoInputRef.current) arquivoInputRef.current.value = '';
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO_ANEXO) {
      setErroAnexo('O arquivo excede o limite máximo permitido de 10 MB.');
      if (arquivoInputRef.current) arquivoInputRef.current.value = '';
      return;
    }

    setEnviandoAnexo(true);
    try {
      const resultado = await uploadArquivoCloudinary(arquivo);
      setAnexoNovo({
        url: resultado.url,
        nomeArquivo: resultado.nomeArquivo,
        tipoArquivo: resultado.tipoArquivo,
        tamanho: resultado.tamanho,
      });
      toast.sucesso('Arquivo carregado com sucesso!');
    } catch (err) {
      setErroAnexo(err instanceof Error ? err.message : 'Falha ao enviar arquivo.');
      if (arquivoInputRef.current) arquivoInputRef.current.value = '';
    } finally {
      setEnviandoAnexo(false);
    }
  }

  function removerAnexoNovo() {
    setAnexoNovo(null);
    setErroAnexo(null);
    if (arquivoInputRef.current) arquivoInputRef.current.value = '';
  }

  async function salvarTarefa(e: React.FormEvent) {
    e.preventDefault();

    let temErro = false;
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) {
      setErroTitulo('Informe o título do modelo.');
      temErro = true;
    } else {
      setErroTitulo(undefined);
    }

    const prazoIso = localParaIso(prazo);
    if (!prazoIso) {
      setErroPrazo('Informe a data e horário limite.');
      temErro = true;
    } else if (new Date(prazoIso).getTime() <= Date.now()) {
      setErroPrazo('O prazo deve ser uma data futura.');
      temErro = true;
    } else {
      setErroPrazo(undefined);
    }

    if (!temaId) {
      setErroTema('O tema é obrigatório para a criação de tarefas gerais.');
      temErro = true;
    } else if (temaId === NOVO_TEMA && !tituloNovoTema.trim()) {
      setErroTema('Informe o título da proposta do novo tema.');
      temErro = true;
    } else {
      setErroTema(undefined);
    }

    if (temErro || !prazoIso) return;

    setSalvando(true);
    setErroGeral(null);

    const dadosBase: DadosDeTarefa = {
      tituloTarefa: tituloLimpo,
      prazoEntrega: prazoIso,
      ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
    };

    if (temaId === NOVO_TEMA) {
      dadosBase.novoTema = {
        tituloTema: tituloNovoTema.trim(),
        ...(textoNovoTema.trim() ? { textoMotivador: textoNovoTema.trim() } : {}),
        ...(imagemNovoTema.trim() ? { imagemUrl: imagemNovoTema.trim() } : {}),
      };
    } else if (temaId) {
      dadosBase.idTema = Number(temaId);
    }

    try {
      if (janela?.tipo === 'novo') {
        // 1. Cria a tarefa geral na Administração
        const novaTarefa = await adminService.criarTarefaGeral(dadosBase);

        // 2. Se houver anexo enviado ao Cloudinary, vincula à tarefa
        if (anexoNovo) {
          try {
            await adminService.adicionarAnexo(novaTarefa.id, {
              nomeArquivo: anexoNovo.nomeArquivo,
              url: anexoNovo.url,
              tipoArquivo: anexoNovo.tipoArquivo,
            });
          } catch (errAnexo) {
            console.error('Falha ao associar anexo:', errAnexo);
            toast.info('Modelo criado, porém o anexo não pôde ser vinculado.');
          }
        }
        toast.sucesso('Modelo de atividade geral cadastrado com sucesso!');
      } else if (janela?.tipo === 'editar') {
        await adminService.atualizarTarefaGeral(janela.tarefa.id, dadosBase);
        toast.sucesso('Modelo atualizado com sucesso!');
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

  async function adicionarAnexoAvulso(tarefaId: number) {
    if (!anexoNovo) return;
    setSalvando(true);
    setErroGeral(null);
    try {
      await adminService.adicionarAnexo(tarefaId, {
        nomeArquivo: anexoNovo.nomeArquivo,
        url: anexoNovo.url,
        tipoArquivo: anexoNovo.tipoArquivo,
      });
      toast.sucesso('Anexo adicionado com sucesso!');
      setAnexoNovo(null);
      if (arquivoInputRef.current) arquivoInputRef.current.value = '';
      recarregar();
      // Atualiza a tarefa atual na janela
      const atualizada = await adminService.obterTarefa(tarefaId);
      setJanela({ tipo: 'anexos', tarefa: atualizada });
    } catch (err) {
      setErroGeral(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  async function removerAnexoExistente(tarefaId: number, anexoId: number) {
    setRemovendoAnexoId(anexoId);
    setErroGeral(null);
    try {
      await adminService.removerAnexo(tarefaId, anexoId);
      toast.sucesso('Anexo removido com sucesso!');
      recarregar();
      const atualizada = await adminService.obterTarefa(tarefaId);
      setJanela({ tipo: 'anexos', tarefa: atualizada });
    } catch (err) {
      setErroGeral(mensagemDeErro(err));
    } finally {
      setRemovendoAnexoId(null);
    }
  }

  async function confirmarExclusaoTarefa(tarefa: TarefaDoTutor) {
    setExcluindo(true);
    setErroGeral(null);
    try {
      await adminService.excluirTarefaGeral(tarefa.id);
      toast.sucesso('Modelo de atividade excluído com sucesso!');
      fecharJanela();
      recarregar();
    } catch (err) {
      if (err instanceof ApiError && err.codigo === 'TAREFA_EM_USO') {
        setErroGeral('Não é possível excluir esta atividade geral pois ela já foi replicada por tutores ou possui redações vinculadas.');
      } else {
        setErroGeral(mensagemDeErro(err));
      }
    } finally {
      setExcluindo(false);
    }
  }

  const colunas: Coluna<TarefaDoTutor>[] = [
    {
      chave: 'titulo',
      titulo: 'Modelo de Atividade',
      celula: (t) => (
        <div className={styles.celulaTitulo}>
          <div className={styles.tagsTitulo}>
            <strong>{t.tituloTarefa}</strong>
            <Badge tom={t.modalidade === 'GERAL' ? 'sucesso' : 'neutro'}>
              {t.modalidade === 'GERAL' ? 'Geral (Modelo)' : 'Turma'}
            </Badge>
            {prazoEncerrado(t.prazoEntrega) && <Badge tom="perigo">Prazo expirado</Badge>}
          </div>
          {t.descricao && <span className={styles.previaDescricao}>{t.descricao}</span>}
        </div>
      ),
    },
    {
      chave: 'tema',
      titulo: 'Tema Vinculado',
      celula: (t) => t.tema?.tituloTema ?? '—',
    },
    {
      chave: 'prazo',
      titulo: 'Prazo Sugerido',
      celula: (t) => formatarDataHora(t.prazoEntrega),
    },
    {
      chave: 'replicada',
      titulo: 'Aplicações por Tutores',
      alinhamento: 'centro',
      celula: (t) => {
        const total = t._count?.tarefasAplicadas ?? 0;
        return (
          <Badge tom={total > 0 ? 'sucesso' : 'neutro'}>
            {total === 1 ? '1 tutor aplicou' : `${total} tutores aplicaram`}
          </Badge>
        );
      },
    },
    {
      chave: 'anexos',
      titulo: 'Anexos',
      alinhamento: 'centro',
      celula: (t) => (
        <div className={styles.celulaAnexos}>
          <Paperclip size={14} aria-hidden="true" />
          <span>{t.anexos ? t.anexos.length : 0}</span>
        </div>
      ),
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
            onClick={() => setJanela({ tipo: 'detalhes', tarefa: t })}
          >
            Detalhes
          </Button>
          <Button
            variante="secundario"
            tamanho="sm"
            icone={<Paperclip size={15} aria-hidden="true" />}
            onClick={() => {
              setErroGeral(null);
              setJanela({ tipo: 'anexos', tarefa: t });
            }}
          >
            Anexos ({t.anexos ? t.anexos.length : 0})
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
              setJanela({ tipo: 'excluir', tarefa: t });
            }}
          >
            Remover
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Tarefas Gerais (Modelos)"
        descricao="Cadastre modelos de tarefas de redação com anexos para que os tutores possam replicar aos seus grupos."
        acao={
          <Button icone={<Plus size={18} aria-hidden="true" />} onClick={abrirCriacao}>
            Novo modelo de tarefa
          </Button>
        }
      />

      {/* Grade de Métricas */}
      <div className={styles.gradeMetricas}>
        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <FileText size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Modelos Gerais</span>
            <span className={styles.valorMetrica}>{totalModelos}</span>
            <span className={styles.subMetrica}>Disponíveis para os tutores</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <Copy size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Modelos em Uso</span>
            <span className={styles.valorMetrica}>{modelosReplicados}</span>
            <span className={styles.subMetrica}>Já aplicados por tutores</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <Layers size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Total de Aplicações</span>
            <span className={styles.valorMetrica}>{totalReplicacoes}</span>
            <span className={styles.subMetrica}>Tarefas geradas nas turmas</span>
          </div>
        </div>

        <div className={styles.cartaoMetrica}>
          <div className={styles.iconeMetrica}>
            <Paperclip size={22} aria-hidden="true" />
          </div>
          <div className={styles.textosMetrica}>
            <span className={styles.rotuloMetrica}>Com Anexos</span>
            <span className={styles.valorMetrica}>{modelosComAnexos}</span>
            <span className={styles.subMetrica}>Materiais anexados às tarefas</span>
          </div>
        </div>
      </div>

      {/* Barra de Ferramentas e Filtros */}
      <div className={styles.barraFerramentas}>
        <div className={styles.grupoFiltros}>
          <div className={styles.busca}>
            <Input
              rotulo="Buscar tarefa"
              ocultarRotulo
              type="search"
              placeholder="Buscar por título, orientações ou tema..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className={styles.filtroModalidade}>
            <Select
              rotulo="Visualização"
              ocultarRotulo
              value={filtroModalidade}
              onChange={(e) => setFiltroModalidade(e.target.value as 'GERAL' | 'TODAS')}
            >
              <option value="GERAL">Modelos Gerais da Administração ({totalModelos})</option>
              <option value="TODAS">Todas as Tarefas ({tarefas?.length ?? 0})</option>
            </Select>
          </div>
        </div>

        <div className={styles.contadores}>
          {!carregando && !erro && (
            <span className={styles.contagem}>
              {listaFiltrada.length} {listaFiltrada.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}
            </span>
          )}
        </div>
      </div>

      {carregando ? (
        <CarregandoPagina rotulo="Carregando modelos de tarefas..." />
      ) : erro ? (
        <ErrorState mensagem={erro.message} conexao={erro.ehErroDeConexao} aoTentarNovamente={recarregar} />
      ) : listaFiltrada.length === 0 ? (
        <EmptyState
          titulo={busca ? 'Nenhuma atividade encontrada' : 'Nenhum modelo de tarefa cadastrado'}
          descricao={
            busca
              ? 'Tente ajustar os termos de busca.'
              : 'Clique em "Novo modelo de tarefa" para disponibilizar atividades para os tutores.'
          }
        />
      ) : (
        <Tabela
          colunas={colunas}
          linhas={listaFiltrada}
          chaveDaLinha={(t) => t.id}
          descricao="Lista de modelos de tarefas gerais para tutores"
        />
      )}

      {/* Modal Criar / Editar Tarefa Geral */}
      <Modal
        aberto={janela?.tipo === 'novo' || janela?.tipo === 'editar'}
        aoFechar={fecharJanela}
        titulo={janela?.tipo === 'novo' ? 'Novo Modelo de Tarefa Geral' : 'Editar Modelo de Tarefa'}
      >
        <form className={styles.formulario} onSubmit={salvarTarefa} noValidate>
          {erroGeral && <Alerta tom="erro">{erroGeral}</Alerta>}

          <Input
            rotulo="Título da Tarefa"
            placeholder="Ex.: Redação 01 - Proposta Modelo ENEM"
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              if (erroTitulo) setErroTitulo(undefined);
            }}
            maxLength={200}
            erro={erroTitulo}
            dica="Título que identifica a atividade (máximo 200 caracteres)."
            required
          />

          <Textarea
            rotulo="Instruções e Orientações (opcional)"
            placeholder="Orientações aos tutores e estudantes sobre o desenvolvimento da redação..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={10000}
            rows={4}
            dica="Informações detalhadas sobre a proposta de redação."
          />

          <div className={styles.linhaDupla}>
            <Input
              rotulo="Prazo de Entrega Sugerido"
              type="datetime-local"
              value={prazo}
              onChange={(e) => {
                setPrazo(e.target.value);
                if (erroPrazo) setErroPrazo(undefined);
              }}
              erro={erroPrazo}
              dica="Data limite futura recomendada aos tutores."
              required
            />

            <Select
              rotulo="Tema Associado (Obrigatório)"
              value={temaId}
              onChange={(e) => {
                setTemaId(e.target.value);
                if (erroTema) setErroTema(undefined);
              }}
              erro={erroTema}
              dica="Selecione um tema obrigatório do acervo ou cadastre um novo."
              required
            >
              <option value="">Selecione um tema obrigatório...</option>
              {(temas ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tituloTema} ({t.origem || 'ADMIN'})
                </option>
              ))}
              {janela?.tipo === 'novo' && <option value={NOVO_TEMA}>＋ Cadastrar novo tema agora</option>}
            </Select>
          </div>

          {temaId === NOVO_TEMA && (
            <div className={styles.formulario} style={{ padding: '12px', background: 'var(--cor-fundo, #f3f7f6)', borderRadius: '8px' }}>
              <Input
                rotulo="Título do Novo Tema Oficial"
                placeholder="Ex.: Desafios da segurança hídrica no Brasil"
                value={tituloNovoTema}
                onChange={(e) => {
                  setTituloNovoTema(e.target.value);
                  if (erroTema) setErroTema(undefined);
                }}
                maxLength={200}
                erro={erroTema}
                required
              />
              <Textarea
                rotulo="Texto Motivador / Coletânea do Novo Tema (opcional)"
                placeholder="Excertos de textos, leis ou dados estatísticos da proposta... Use a tag [IMAGEM] onde a imagem deve aparecer."
                value={textoNovoTema}
                onChange={(e) => setTextoNovoTema(e.target.value)}
                maxLength={10000}
                rows={3}
                dica="Texto de apoio aos alunos. Digite [IMAGEM] para posicionar a imagem da proposta."
              />
              <Input
                rotulo="URL da Imagem Motivadora / Coletânea Visual (opcional)"
                placeholder="https://exemplo.com/imagem-coletanea.png"
                value={imagemNovoTema}
                onChange={(e) => setImagemNovoTema(e.target.value)}
                maxLength={500}
                dica="URL pública da imagem de apoio. No texto motivador, use a tag [IMAGEM] onde ela deve aparecer."
              />
            </div>
          )}

          {/* Upload Cloudinary na criação */}
          {janela?.tipo === 'novo' && (
            <div className={styles.campoAnexo}>
              <div className={styles.rotuloAnexo}>
                <span>Material de Apoio / Anexo </span>
                <span className={styles.dicaAnexo}>PDF ou imagem (PNG, JPG, WEBP) de até 10 MB</span>
              </div>

              {erroAnexo && <Alerta tom="erro">{erroAnexo}</Alerta>}

              {anexoNovo ? (
                <div className={styles.anexoCarregado}>
                  <div className={styles.infoArquivo}>
                    <Paperclip size={18} className={styles.iconeArquivo} aria-hidden="true" />
                    <div className={styles.detalhesArquivo}>
                      <span className={styles.nomeArquivo}>{anexoNovo.nomeArquivo}</span>
                      <span className={styles.tamanhoArquivo}>
                        {(anexoNovo.tamanho / (1024 * 1024)).toFixed(2)} MB • Pronto para vinculação
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variante="perigo"
                    tamanho="sm"
                    icone={<Trash2 size={14} aria-hidden="true" />}
                    onClick={removerAnexoNovo}
                    disabled={salvando}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <div className={styles.uploadContainer}>
                  <input
                    ref={arquivoInputRef}
                    type="file"
                    id="anexo-modal-admin"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={aoSelecionarArquivoCloudinary}
                    disabled={salvando || enviandoAnexo}
                    className={styles.inputArquivoOculto}
                  />
                  <label htmlFor="anexo-modal-admin" className={styles.botaoUpload}>
                    {enviandoAnexo ? (
                      <>
                        <Spinner tamanho="sm" rotulo="Enviando..." />
                        <span>Enviando para o Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={20} aria-hidden="true" />
                        <span>Selecionar arquivo de anexo</span>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>
          )}

          <div className={styles.botoesModal}>
            <Button variante="secundario" onClick={fecharJanela} disabled={salvando || enviandoAnexo}>
              Cancelar
            </Button>
            <Button type="submit" carregando={salvando} disabled={enviandoAnexo}>
              {janela?.tipo === 'novo' ? 'Criar Modelo' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Gerenciar Anexos */}
      <Modal
        aberto={janela?.tipo === 'anexos'}
        aoFechar={fecharJanela}
        titulo={janela?.tipo === 'anexos' ? `Anexos: ${janela.tarefa.tituloTarefa}` : 'Gerenciar Anexos'}
      >
        {janela?.tipo === 'anexos' && (
          <div className={styles.secaoAnexos}>
            {erroGeral && <Alerta tom="erro">{erroGeral}</Alerta>}

            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--cor-texto-suave, #6b7d80)' }}>
              Arquivos anexados a este modelo ficam acessíveis aos tutores e são replicados para as turmas.
            </p>

            {/* Lista de anexos existentes */}
            <div>
              <h4 style={{ fontSize: '0.92rem', marginBottom: '8px' }}>Arquivos Vinculados</h4>
              {janela.tarefa.anexos && janela.tarefa.anexos.length > 0 ? (
                <ul className={styles.listaAnexos}>
                  {janela.tarefa.anexos.map((a) => {
                    const url = urlSegura(a.caminhoArquivo);
                    const estaRemovendo = removendoAnexoId === a.id;
                    return (
                      <li key={a.id} className={styles.itemAnexo}>
                        <div className={styles.infoArquivo}>
                          <Paperclip size={18} className={styles.iconeArquivo} aria-hidden="true" />
                          <div className={styles.detalhesArquivo}>
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.linkArquivo}
                              >
                                {a.nomeArquivo}
                                <ExternalLink size={13} aria-hidden="true" />
                              </a>
                            ) : (
                              <span className={styles.nomeArquivo}>{a.nomeArquivo}</span>
                            )}
                            <span className={styles.tamanhoArquivo}>{a.tipoArquivo}</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variante="perigo"
                          tamanho="sm"
                          icone={<Trash2 size={14} aria-hidden="true" />}
                          carregando={estaRemovendo}
                          onClick={() => void removerAnexoExistente(janela.tarefa.id, a.id)}
                        >
                          Excluir
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={styles.vazioAnexos}>Nenhum anexo cadastrado nesta atividade.</div>
              )}
            </div>

            {/* Upload de novo anexo */}
            <div className={styles.campoAnexo}>
              <div className={styles.rotuloAnexo}>
                <span>Adicionar Novo Anexo (Cloudinary)</span>
                <span className={styles.dicaAnexo}>PDF ou imagem (PNG, JPG, WEBP) de até 10 MB</span>
              </div>

              {erroAnexo && <Alerta tom="erro">{erroAnexo}</Alerta>}

              {anexoNovo ? (
                <div className={styles.anexoCarregado}>
                  <div className={styles.infoArquivo}>
                    <Paperclip size={18} className={styles.iconeArquivo} aria-hidden="true" />
                    <div className={styles.detalhesArquivo}>
                      <span className={styles.nomeArquivo}>{anexoNovo.nomeArquivo}</span>
                      <span className={styles.tamanhoArquivo}>
                        {(anexoNovo.tamanho / (1024 * 1024)).toFixed(2)} MB • Pronto para salvar
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      type="button"
                      variante="secundario"
                      tamanho="sm"
                      onClick={removerAnexoNovo}
                      disabled={salvando}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variante="primario"
                      tamanho="sm"
                      carregando={salvando}
                      onClick={() => void adicionarAnexoAvulso(janela.tarefa.id)}
                    >
                      Salvar Anexo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.uploadContainer}>
                  <input
                    ref={arquivoInputRef}
                    type="file"
                    id="novo-anexo-avulso"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={aoSelecionarArquivoCloudinary}
                    disabled={salvando || enviandoAnexo}
                    className={styles.inputArquivoOculto}
                  />
                  <label htmlFor="novo-anexo-avulso" className={styles.botaoUpload}>
                    {enviandoAnexo ? (
                      <>
                        <Spinner tamanho="sm" rotulo="Enviando para o Cloudinary..." />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={20} aria-hidden="true" />
                        <span>Selecionar arquivo para upload</span>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>

            <div className={styles.botoesModal}>
              <Button onClick={fecharJanela}>Concluir</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Detalhes da Tarefa Geral */}
      <Modal
        aberto={janela?.tipo === 'detalhes'}
        aoFechar={fecharJanela}
        titulo={janela?.tipo === 'detalhes' ? janela.tarefa.tituloTarefa : 'Detalhes do Modelo'}
      >
        {janela?.tipo === 'detalhes' && (
          <div className={styles.detalhesTarefa}>
            <div className={styles.infoGeral}>
              <div className={styles.itemInfo}>
                <span>Modalidade:</span>
                <Badge tom={janela.tarefa.modalidade === 'GERAL' ? 'sucesso' : 'neutro'}>
                  {janela.tarefa.modalidade === 'GERAL' ? 'Atividade Geral (Modelo)' : 'Tarefa Avaliativa'}
                </Badge>
              </div>

              <div className={styles.itemInfo}>
                <span>Prazo sugerido de entrega:</span>
                <strong>{formatarDataHora(janela.tarefa.prazoEntrega)}</strong>
                {prazoEncerrado(janela.tarefa.prazoEntrega) && <Badge tom="perigo">Prazo expirado</Badge>}
              </div>

              <div className={styles.itemInfo}>
                <span>Aplicações por Tutores:</span>
                <Badge tom={(janela.tarefa._count?.tarefasAplicadas ?? 0) > 0 ? 'sucesso' : 'neutro'}>
                  {`${janela.tarefa._count?.tarefasAplicadas ?? 0} turma(s) vinculada(s)`}
                </Badge>
              </div>
            </div>

            {janela.tarefa.descricao && (
              <div className={styles.blocoOrientacoes}>
                <h4>Orientações e Instruções</h4>
                <p>{janela.tarefa.descricao}</p>
              </div>
            )}

            {janela.tarefa.tema ? (
              <div className={styles.blocoTema}>
                <h4>Tema de Redação Associado</h4>
                <strong>{janela.tarefa.tema.tituloTema}</strong>
                <TextoMotivador
                  texto={janela.tarefa.tema.textoMotivador}
                  imagemUrl={janela.tarefa.tema.imagemUrl}
                  titulo={janela.tarefa.tema.tituloTema}
                />
              </div>
            ) : (
              <Alerta tom="info">Esta atividade não possui um tema de redação associado.</Alerta>
            )}

            {janela.tarefa.anexos && janela.tarefa.anexos.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem', marginBottom: '8px' }}>Material de Apoio e Anexos</h4>
                <ul className={styles.listaAnexos}>
                  {janela.tarefa.anexos.map((a) => {
                    const url = urlSegura(a.caminhoArquivo);
                    return (
                      <li key={a.id} className={styles.itemAnexo}>
                        <div className={styles.infoArquivo}>
                          <Paperclip size={18} className={styles.iconeArquivo} aria-hidden="true" />
                          <div className={styles.detalhesArquivo}>
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.linkArquivo}
                              >
                                {a.nomeArquivo}
                                <ExternalLink size={13} aria-hidden="true" />
                              </a>
                            ) : (
                              <span className={styles.nomeArquivo}>{a.nomeArquivo}</span>
                            )}
                            <span className={styles.tamanhoArquivo}>{a.tipoArquivo}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className={styles.botoesModal}>
              <Button
                variante="secundario"
                icone={<Edit2 size={16} />}
                onClick={() => janela?.tipo === 'detalhes' && abrirEdicao(janela.tarefa)}
              >
                Editar modelo
              </Button>
              <Button onClick={fecharJanela}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Excluir Modelo de Tarefa */}
      <Modal
        aberto={janela?.tipo === 'excluir'}
        aoFechar={fecharJanela}
        titulo="Excluir Modelo de Atividade?"
        rodape={
          <>
            <Button variante="secundario" disabled={excluindo} onClick={fecharJanela}>
              Cancelar
            </Button>
            <Button
              variante="perigo"
              carregando={excluindo}
              onClick={() => janela?.tipo === 'excluir' && void confirmarExclusaoTarefa(janela.tarefa)}
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
              Você está prestes a excluir o modelo de tarefa <strong>{janela.tarefa.tituloTarefa}</strong>.
            </p>
            {(janela.tarefa._count?.tarefasAplicadas ?? 0) > 0 && (
              <Alerta tom="alerta">
                Esta atividade geral já foi aplicada por{' '}
                <strong>{janela.tarefa._count?.tarefasAplicadas} tutor(es)</strong> às suas turmas. O sistema bloqueia a
                exclusão de modelos já replicados.
              </Alerta>
            )}
            <p>Esta ação é irreversível.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
