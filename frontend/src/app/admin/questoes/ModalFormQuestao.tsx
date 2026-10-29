'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  Wand2,
} from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select, Textarea } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { RenderizadorQuestao } from '@/components/questoes/RenderizadorQuestao';
import {
  extrairTextoBaseEEnunciado,
  formatarTextoComTextoBase,
  parsearTextoQuestao,
} from '@/components/questoes/textoBaseHelper';
import { cx } from '@/lib/cx';
import { mensagemDeErro } from '@/lib/erros';
import { uploadImagemCloudinary } from '@/services/cloudinary';
import { questoesService } from '@/services/questoes';
import type { Assunto, CriarQuestaoPayload, Questao } from '@/types/simulados';
import styles from './ModalFormQuestao.module.scss';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  questaoParaEditar?: Questao | null;
  assuntosDisponiveis: Assunto[];
  questoesExistentes?: Questao[];
  aoAbrirGestaoAssuntos: () => void;
  aoSucesso: () => void;
}

const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;

function tomDificuldade(dif: string): TomDoBadge {
  switch (dif?.toUpperCase()) {
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

export function ModalFormQuestao({
  aberto,
  aoFechar,
  questaoParaEditar,
  assuntosDisponiveis,
  questoesExistentes = [],
  aoAbrirGestaoAssuntos,
  aoSucesso,
}: Props) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aba ativa: 'formulario' (edição) ou 'preview' (visualizar formatação em tempo real)
  const [abaAtiva, setAbaAtiva] = useState<'formulario' | 'preview'>('formulario');

  // Cadastro Inteligente (Colar Questão Bruta)
  const [caixaImportacaoAberta, setCaixaImportacaoAberta] = useState(true);
  const [textoColado, setTextoColado] = useState('');

  // Texto Base Compartilhado
  const [textoBase, setTextoBase] = useState('');

  // Campos principais
  const [enunciado, setEnunciado] = useState('');
  const [imagemUrl, setImagemUrl] = useState<string>('');
  const [fazendoUploadImagem, setFazendoUploadImagem] = useState(false);

  const [vestibular, setVestibular] = useState('ENEM');
  const [vestibularOutro, setVestibularOutro] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [numeroQuestao, setNumeroQuestao] = useState<string>('');
  const [grauDificuldade, setGrauDificuldade] = useState('MEDIA');

  const [alternativas, setAlternativas] = useState<Record<string, string>>({
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
  });
  const [letraCorreta, setLetraCorreta] = useState<string>('A');

  const [assuntosSelecionados, setAssuntosSelecionados] = useState<number[]>([]);
  const [explicacaoGabarito, setExplicacaoGabarito] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Lista de Textos Base únicos de outras questões para reuso
  const textosBaseExistentes = useMemo(() => {
    const lista: { id: number; vestibular: string; ano: number; texto: string; preview: string }[] = [];
    const vistos = new Set<string>();

    for (const q of questoesExistentes) {
      const extraido = extrairTextoBaseEEnunciado(q.enunciado);
      if (extraido.textoBase) {
        const chave = extraido.textoBase.trim();
        if (!vistos.has(chave)) {
          vistos.add(chave);
          lista.push({
            id: q.id,
            vestibular: q.vestibular,
            ano: q.ano,
            texto: chave,
            preview: `(${q.vestibular} ${q.ano}) ${chave.slice(0, 65)}...`,
          });
        }
      }
    }
    return lista;
  }, [questoesExistentes]);

  // Preenche dados ao editar ou reseta ao abrir para nova questão
  useEffect(() => {
    if (!aberto) return;

    if (questaoParaEditar) {
      // Extrai texto base e enunciado principal
      const extraido = extrairTextoBaseEEnunciado(questaoParaEditar.enunciado);
      setTextoBase(extraido.textoBase ?? '');
      setEnunciado(extraido.enunciado);

      setImagemUrl(questaoParaEditar.imagemUrl ?? '');

      const v = questaoParaEditar.vestibular.toUpperCase();
      if (['ENEM', 'FUVEST', 'UNICAMP'].includes(v)) {
        setVestibular(v);
        setVestibularOutro('');
      } else {
        setVestibular('OUTRO');
        setVestibularOutro(questaoParaEditar.vestibular);
      }

      setAno(questaoParaEditar.ano);
      setNumeroQuestao(questaoParaEditar.numeroQuestao ? String(questaoParaEditar.numeroQuestao) : '');
      setGrauDificuldade(questaoParaEditar.grauDificuldade);

      const altMap: Record<string, string> = { A: '', B: '', C: '', D: '', E: '' };
      let correta = 'A';
      questaoParaEditar.alternativas.forEach((alt) => {
        altMap[alt.letraOpcao] = alt.textoAlternativa;
        if (alt.alternativaCorreta) {
          correta = alt.letraOpcao;
        }
      });
      setAlternativas(altMap);
      setLetraCorreta(correta);

      const idsAssuntos = (questaoParaEditar.assuntos || [])
        .map((v) => (v && 'assunto' in v && v.assunto ? v.assunto.id : v.idAssunto ?? 0))
        .filter(Boolean);
      setAssuntosSelecionados(idsAssuntos);

      setExplicacaoGabarito(questaoParaEditar.explicacaoGabarito ?? '');
      setCaixaImportacaoAberta(false);
      setTextoColado('');
    } else {
      // Reset para nova questão
      setTextoBase('');
      setEnunciado('');
      setImagemUrl('');
      setVestibular('ENEM');
      setVestibularOutro('');
      setAno(new Date().getFullYear());
      setNumeroQuestao('');
      setGrauDificuldade('MEDIA');
      setAlternativas({ A: '', B: '', C: '', D: '', E: '' });
      setLetraCorreta('A');
      setAssuntosSelecionados([]);
      setExplicacaoGabarito('');
      setCaixaImportacaoAberta(true);
      setTextoColado('');
    }
    setAbaAtiva('formulario');
    setErro(null);
  }, [aberto, questaoParaEditar]);

  // Função de Importação Inteligente via Regex
  function handleProcessarTextoColado() {
    if (!textoColado.trim()) {
      setErro('Cole o texto da questão para processar.');
      return;
    }

    try {
      const parseada = parsearTextoQuestao(textoColado);

      if (parseada.vestibular) {
        if (['ENEM', 'FUVEST', 'UNICAMP'].includes(parseada.vestibular)) {
          setVestibular(parseada.vestibular);
          setVestibularOutro('');
        } else {
          setVestibular('OUTRO');
          setVestibularOutro(parseada.vestibular);
        }
      }

      if (parseada.ano) setAno(parseada.ano);
      if (parseada.numeroQuestao) setNumeroQuestao(String(parseada.numeroQuestao));

      if (parseada.textoBase) setTextoBase(parseada.textoBase);
      if (parseada.enunciado) setEnunciado(parseada.enunciado);

      if (parseada.alternativas) {
        setAlternativas((prev) => ({
          ...prev,
          ...parseada.alternativas,
        }));
      }

      if (parseada.letraCorreta) {
        setLetraCorreta(parseada.letraCorreta);
      }

      if (parseada.explicacaoGabarito) {
        setExplicacaoGabarito(parseada.explicacaoGabarito);
      }

      toast.sucesso('Campos preenchidos com sucesso a partir do texto colado!');
      setCaixaImportacaoAberta(false);
      setErro(null);
    } catch {
      setErro('Não foi possível identificar o formato da questão. Verifique o texto colado.');
    }
  }

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      setErro('Por favor selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    setFazendoUploadImagem(true);
    setErro(null);
    try {
      const url = await uploadImagemCloudinary(arquivo);
      setImagemUrl(url);
      toast.sucesso('Imagem enviada com sucesso!');
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setFazendoUploadImagem(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function toggleAssunto(idAssunto: number) {
    setAssuntosSelecionados((atual) =>
      atual.includes(idAssunto) ? atual.filter((id) => id !== idAssunto) : [...atual, idAssunto],
    );
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!enunciado.trim()) {
      setErro('O enunciado da questão é obrigatório.');
      setAbaAtiva('formulario');
      return;
    }

    const vestibularFinal = (vestibular === 'OUTRO' ? vestibularOutro.trim() : vestibular).toUpperCase();
    if (!vestibularFinal) {
      setErro('Informe o vestibular da questão.');
      setAbaAtiva('formulario');
      return;
    }

    if (!ano || isNaN(ano) || ano < 1950 || ano > 2100) {
      setErro('Informe um ano válido para a questão.');
      setAbaAtiva('formulario');
      return;
    }

    for (const letra of LETRAS) {
      if (!alternativas[letra]?.trim()) {
        setErro(`Preencha o texto da Alternativa ${letra}.`);
        setAbaAtiva('formulario');
        return;
      }
    }

    if (!letraCorreta) {
      setErro('Indique qual alternativa é a correta.');
      setAbaAtiva('formulario');
      return;
    }

    // Empacota enunciado com Texto Base Compartilhado (se houver)
    const enunciadoComTextoBase = formatarTextoComTextoBase(enunciado, textoBase);

    const payload: CriarQuestaoPayload = {
      enunciado: enunciadoComTextoBase,
      imagemUrl: imagemUrl.trim() || undefined,
      vestibular: vestibularFinal,
      ano: Number(ano),
      numeroQuestao: numeroQuestao ? Number(numeroQuestao) : undefined,
      grauDificuldade,
      explicacaoGabarito: explicacaoGabarito.trim() || undefined,
      idAssuntos: assuntosSelecionados,
      alternativas: LETRAS.map((letra) => ({
        letraOpcao: letra,
        textoAlternativa: (alternativas[letra] || '').trim(),
        alternativaCorreta: letra === letraCorreta,
      })),
    };

    setSalvando(true);
    try {
      if (questaoParaEditar) {
        await questoesService.atualizar(questaoParaEditar.id, payload);
        toast.sucesso('Questão atualizada com sucesso!');
      } else {
        await questoesService.criar(payload);
        toast.sucesso('Questão criada com sucesso no banco de questões!');
      }
      aoSucesso();
      aoFechar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={questaoParaEditar ? `Editar Questão #${questaoParaEditar.id}` : 'Cadastrar Nova Questão'}
      tamanho="xl"
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar} disabled={salvando || fazendoUploadImagem}>
            Cancelar
          </Button>

          {/* {abaAtiva === 'formulario' ? (
            <Button
              type="button"
              variante="secundario"
              icone={<Eye size={15} aria-hidden="true" />}
              onClick={() => setAbaAtiva('preview')}
            >
              Visualizar Formatação
            </Button>
          ) : (
            <Button
              type="button"
              variante="secundario"
              icone={<Edit3 size={15} aria-hidden="true" />}
              onClick={() => setAbaAtiva('formulario')}
            >
              Voltar para Edição
            </Button>
          )} */}

          <Button
            variante="primario"
            carregando={salvando}
            disabled={fazendoUploadImagem}
            onClick={(e) => void handleSalvar(e)}
          >
            {questaoParaEditar ? 'Salvar Alterações' : 'Salvar Questão'}
          </Button>
        </>
      }
    >
      {/* 0. Barra de Abas (Alternador): Edição vs Visualizar Formatação (Live Preview) */}
      <div className={styles.barraAbas} role="tablist" aria-label="Modo de edição da questão">
        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'formulario'}
          className={cx(styles.botaoAba, abaAtiva === 'formulario' && styles.abaAtiva)}
          onClick={() => setAbaAtiva('formulario')}
        >
          <Edit3 size={15} aria-hidden="true" />
          <span>Formulário de Edição</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={abaAtiva === 'preview'}
          className={cx(styles.botaoAba, abaAtiva === 'preview' && styles.abaAtiva)}
          onClick={() => setAbaAtiva('preview')}
        >
          <Eye size={15} aria-hidden="true" />
          <span>Visualizar Formatação</span>
          <span className={styles.badgeLive}>Live</span>
        </button>
      </div>

      {erro && <Alerta tom="erro">{erro}</Alerta>}

      {abaAtiva === 'formulario' ? (
        <form onSubmit={handleSalvar} className={styles.form}>

        {/* 0. CADASTRO INTELIGENTE: Campo "Colar Questão Completa" e botão "Auto-preencher Campos" */}
        <section className={styles.caixaImportacaoInteligente}>
          <div
            className={styles.cabecalhoImportacao}
            onClick={() => setCaixaImportacaoAberta((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setCaixaImportacaoAberta((prev) => !prev);
              }
            }}
          >
            <div>
              <div className={styles.tituloImportacao}>
                <Wand2 size={18} color="#006b70" aria-hidden="true" />
                <span>Colar Questão Completa (Automação de Cadastro)</span>
              </div>
              <span className={styles.subtituloImportacao}>
                Cole o texto bruto da questão com cabeçalho, texto base, enunciado e alternativas para preencher tudo automaticamente.
              </span>
            </div>
            <Button
              type="button"
              variante="secundario"
              tamanho="sm"
              onClick={(e) => {
                e.stopPropagation();
                setCaixaImportacaoAberta((prev) => !prev);
              }}
            >
              {caixaImportacaoAberta ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <span>{caixaImportacaoAberta ? 'Ocultar' : 'Exibir Campo'}</span>
            </Button>
          </div>

          {caixaImportacaoAberta && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <Textarea
                rotulo="Colar Questão Completa"
                dica="Suporta cabeçalhos de vestibular, texto de apoio inicial ('Texto para as questões...'), alternativas A a E ('A)', 'a)', 'A.', 'a.', 'A -'), gabarito e resolução."
                placeholder={`Exemplo de questão completa para colar:\n(ENEM 2023) Texto para as questões 14 e 15:\nNo meio do caminho tinha uma pedra...\n\nO poema modernista transcrito acima explora a repetição. Assinale a correta:\nA) Alternativa um...\nB) Alternativa dois...\nC) Alternativa três...\nD) Alternativa quatro...\nE) Alternativa cinco...\nGABARITO: B\nRESOLUÇÃO: A repetição é marca estética de Drummond...`}
                rows={7}
                value={textoColado}
                onChange={(e) => setTextoColado(e.target.value)}
              />
              <div className={styles.acoesImportacao}>
                {textoColado && (
                  <Button
                    type="button"
                    variante="secundario"
                    tamanho="sm"
                    onClick={() => setTextoColado('')}
                  >
                    Limpar Texto
                  </Button>
                )}
                <Button
                  type="button"
                  variante="primario"
                  icone={<Sparkles size={16} aria-hidden="true" />}
                  onClick={handleProcessarTextoColado}
                  disabled={!textoColado.trim()}
                >
                  Auto-preencher Campos
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* 1. TEXTO BASE COMPARTILHADO (Estilo ENEM) */}
        <section className={styles.secao}>
          <div className={styles.secaoTitulo}>
            <span>
              <BookOpen size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden="true" />
              Texto Base Compartilhado (Opcional - Estilo ENEM)
            </span>
          </div>

          <p style={{ fontSize: '0.84rem', color: '#6b7d80', margin: 0 }}>
            Insira o texto-base de apoio que serve a esta e a outras questões do mesmo bloco. Ele será renderizado em
            um card de leitura destacado acima do enunciado.
          </p>

          {textosBaseExistentes.length > 0 && (
            <div>
              <Select
                rotulo="Reutilizar Texto Base de outra questão cadastrada"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) setTextoBase(val);
                }}
                defaultValue=""
              >
                <option value="">-- Selecione para copiar um Texto Base existente --</option>
                {textosBaseExistentes.map((tb) => (
                  <option key={tb.id} value={tb.texto}>
                    {tb.preview}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <Textarea
            rotulo="Texto Base da Questão"
            ocultarRotulo
            placeholder="Digite ou cole o Texto Base de leitura compartilhado (artigo, poema, crônica, dados)..."
            rows={4}
            value={textoBase}
            onChange={(e) => setTextoBase(e.target.value)}
            disabled={salvando}
          />
        </section>

        {/* 2. Enunciado e Marcação [IMAGEM] */}
        <div>
          <Textarea
            rotulo="Enunciado / Comando da Questão *"
            dica="Suporta Markdown (**negrito**, quebras de linha). Use a marcação [IMAGEM] no ponto exato onde a imagem deve aparecer in-line."
            placeholder="Digite o comando da questão. Se houver imagem in-line, insira [IMAGEM] no trecho desejado..."
            rows={5}
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            disabled={salvando}
          />
        </div>

        {/* 3. Upload de Imagem de Apoio via Cloudinary */}
        <section className={styles.secao}>
          <div className={styles.secaoTitulo}>
            <span>
              <ImageIcon size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} aria-hidden="true" />
              Imagem de Apoio
            </span>
          </div>

          <div className={styles.uploadContainer}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleArquivoSelecionado}
            />

            {fazendoUploadImagem ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Spinner tamanho="md" rotulo="Enviando imagem para o Cloudinary..." />
              </div>
            ) : imagemUrl ? (
              <div className={styles.previewContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagemUrl} alt="Preview da questão" className={styles.imagemPreview} />
                <div className={styles.barraAcoesImagem}>
                  <Button
                    type="button"
                    tamanho="sm"
                    variante="secundario"
                    icone={<UploadCloud size={14} aria-hidden="true" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Trocar Imagem
                  </Button>
                  <Button
                    type="button"
                    tamanho="sm"
                    variante="perigo"
                    icone={<Trash2 size={14} aria-hidden="true" />}
                    onClick={() => setImagemUrl('')}
                  >
                    Remover Imagem
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={styles.dropzone}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
              >
                <UploadCloud size={32} color="#006b70" aria-hidden="true" />
                <p className={styles.textoDropzone}>
                  Clique para selecionar uma imagem de apoio ou gráfico da questão
                </p>
                <span style={{ fontSize: '0.78rem', color: '#6b7d80' }}>
                  Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 5MB
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 4. Dados catalográficos */}
        <section className={styles.secao}>
          <div className={styles.secaoTitulo}>Dados Catalográficos e Dificuldade</div>
          <div className={styles.linhaCampos}>
            <Select
              rotulo="Vestibular *"
              value={vestibular}
              onChange={(e) => setVestibular(e.target.value)}
              disabled={salvando}
            >
              <option value="ENEM">ENEM</option>
              <option value="FUVEST">FUVEST</option>
              <option value="UNICAMP">UNICAMP</option>
              <option value="OUTRO">Outro vestibular</option>
            </Select>

            {vestibular === 'OUTRO' && (
              <Input
                rotulo="Nome do Vestibular *"
                placeholder="Ex.: UNESP, UERJ..."
                value={vestibularOutro}
                onChange={(e) => setVestibularOutro(e.target.value)}
                disabled={salvando}
              />
            )}

            <Input
              rotulo="Ano da Prova *"
              type="number"
              min={1990}
              max={2030}
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              disabled={salvando}
            />

            <Input
              rotulo="Nº da Questão"
              type="number"
              placeholder="Ex.: 142 (opcional)"
              value={numeroQuestao}
              onChange={(e) => setNumeroQuestao(e.target.value)}
              disabled={salvando}
            />

            <Select
              rotulo="Grau de Dificuldade *"
              value={grauDificuldade}
              onChange={(e) => setGrauDificuldade(e.target.value)}
              disabled={salvando}
            >
              <option value="FACIL">Fácil</option>
              <option value="MEDIA">Média</option>
              <option value="DIFICIL">Difícil</option>
            </Select>
          </div>
        </section>

        {/* 5. Alternativas A - E */}
        <section className={styles.secao}>
          <div className={styles.secaoTitulo}>
            <span>Alternativas (Marque a correta com o botão seletor)</span>
          </div>

          <div className={styles.listaAlternativas}>
            {LETRAS.map((letra) => {
              const correta = letraCorreta === letra;
              return (
                <div key={letra} className={cx(styles.itemAlternativa, correta && styles.correta)}>
                  <label className={styles.radioCorretaWrapper} title="Marcar como alternativa correta">
                    <input
                      type="radio"
                      name="alternativaCorreta"
                      value={letra}
                      checked={correta}
                      onChange={() => setLetraCorreta(letra)}
                      disabled={salvando}
                    />
                    <div className={cx(styles.letraBadge, correta && styles.ativa)}>{letra}</div>
                  </label>

                  <div className={styles.inputAlternativaWrapper}>
                    <Input
                      rotulo={`Texto da Alternativa ${letra}`}
                      ocultarRotulo
                      placeholder={`Texto da alternativa ${letra}...`}
                      value={alternativas[letra]}
                      onChange={(e) =>
                        setAlternativas((prev) => ({
                          ...prev,
                          [letra]: e.target.value,
                        }))
                      }
                      disabled={salvando}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. Assuntos vinculados */}
        <section className={styles.secao}>
          <div className={styles.secaoTitulo}>
            <span>Tópicos e Assuntos Associados</span>
            <Button
              type="button"
              tamanho="sm"
              variante="secundario"
              icone={<Plus size={14} aria-hidden="true" />}
              onClick={aoAbrirGestaoAssuntos}
            >
              Gerenciar Assuntos
            </Button>
          </div>

          <div className={styles.gradeTags}>
            {assuntosDisponiveis.length === 0 ? (
              <p style={{ fontSize: '0.88rem', color: '#6b7d80' }}>
                Nenhum assunto disponível. Clique em &quot;Gerenciar Assuntos&quot; para cadastrar.
              </p>
            ) : (
              assuntosDisponiveis.map((assunto) => {
                const selecionada = assuntosSelecionados.includes(assunto.id);
                return (
                  <button
                    key={assunto.id}
                    type="button"
                    className={cx(styles.tagAssunto, selecionada && styles.selecionada)}
                    onClick={() => toggleAssunto(assunto.id)}
                  >
                    {selecionada ? <Check size={14} aria-hidden="true" /> : <Tag size={13} aria-hidden="true" />}
                    <span>{assunto.nomeAssunto}</span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* 7. Explicação do Gabarito */}
        <div>
          <Textarea
            rotulo="Explicação e Resolução Comentada do Gabarito (Opcional)"
            placeholder="Forneça o passo a passo pedagógico da resolução para exibição ao aluno..."
            rows={4}
            value={explicacaoGabarito}
            onChange={(e) => setExplicacaoGabarito(e.target.value)}
            disabled={salvando}
          />
        </div>
      </form>
    ) : (
      <section className={styles.painelPreview}>
        <div className={styles.bannerAvisoPreview}>
          <div className={styles.bannerAvisoTexto}>
            <Sparkles size={16} color="#006b70" aria-hidden="true" />
            <span>
              <strong>Vista Prévia em Tempo Real:</strong> assim a questão será visualizada pelo estudante no simulado e no caderno de erros.
            </span>
          </div>
          <Button
            type="button"
            variante="secundario"
            tamanho="sm"
            icone={<Edit3 size={14} aria-hidden="true" />}
            onClick={() => setAbaAtiva('formulario')}
          >
            Editar Campos
          </Button>
        </div>

        <article className={styles.cardSimuladoPreview}>
          {/* Topo / Metadados */}
          <div className={styles.topoSimuladoPreview}>
            <div className={styles.identificacaoPreview}>
              <Badge tom="sucesso">{vestibular === 'OUTRO' ? vestibularOutro || 'OUTRO' : vestibular}</Badge>
              <Badge tom="neutro">{ano || 'Ano'}</Badge>
              {numeroQuestao && <Badge tom="neutro">#{numeroQuestao}</Badge>}
              <Badge tom={tomDificuldade(grauDificuldade)}>{grauDificuldade}</Badge>
            </div>

            <div className={styles.tagsPreview}>
              {assuntosDisponiveis
                .filter((a) => assuntosSelecionados.includes(a.id))
                .map((a) => (
                  <span key={a.id} className={styles.tagAssuntoItem}>
                    <Tag size={10} aria-hidden="true" />
                    {a.nomeAssunto}
                  </span>
                ))}
            </div>
          </div>

          {/* Enunciado formatado com Markdown, Texto Base e [IMAGEM] */}
          {enunciado.trim() || textoBase.trim() ? (
            <RenderizadorQuestao
              conteudo={formatarTextoComTextoBase(enunciado, textoBase)}
              imagemUrl={imagemUrl.trim() || null}
            />
          ) : (
            <div className={styles.avisoCamposVazios}>
              <em>Nenhum enunciado digitado ainda. Preencha o enunciado no formulário para visualizar aqui.</em>
            </div>
          )}

          {/* Alternativas Formatadas */}
          <div className={styles.gradeAlternativasPreview}>
            {LETRAS.map((letra) => {
              const ehCorreta = letraCorreta === letra;
              const textoAlternativa = alternativas[letra];

              return (
                <div
                  key={letra}
                  className={cx(
                    styles.itemAlternativaPreview,
                    ehCorreta && styles.alternativaGabarito,
                  )}
                >
                  <div className={styles.letraCirculoPreview}>{letra}</div>
                  <div className={styles.textoAlternativaPreview}>
                    {textoAlternativa?.trim() ? (
                      textoAlternativa
                    ) : (
                      <span style={{ color: '#8c9c9e', fontStyle: 'italic' }}>
                        (Alternativa {letra} não preenchida)
                      </span>
                    )}
                  </div>
                  {ehCorreta && (
                    <Badge tom="sucesso">
                      <CheckCircle2 size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                      Gabarito Indicado
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resolução Comentada (se preenchida) */}
          {explicacaoGabarito.trim() && (
            <div className={styles.blocoResolucaoPreview}>
              <div className={styles.cabecalhoResolucaoPreview}>
                <BookOpen size={16} aria-hidden="true" />
                <span>Resolução Comentada e Justificativa Pedagógica:</span>
              </div>
              <p>{explicacaoGabarito}</p>
            </div>
          )}
        </article>
      </section>
    )}
  </Modal>
  );
}
