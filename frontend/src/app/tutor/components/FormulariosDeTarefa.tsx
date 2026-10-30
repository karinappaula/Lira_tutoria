'use client';

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Paperclip, Trash2, UploadCloud } from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select, Textarea } from '@/components/ui/Campos/Campos';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useBuscar } from '@/hooks/useBuscar';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { uploadArquivoCloudinary } from '@/services/cloudinary';
import { temasService } from '@/services/redacoes';
import { tutorService, type DadosDeTarefa } from '@/services/tutor';
import styles from './Tutor.module.scss';

const NOVO_TEMA = 'novo';

const TIPOS_ANEXO_VALIDOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const EXTENSOES_VALIDAS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024; // 10 MB

/** Converte o valor do campo de data e hora (horário local) para ISO. */
function localParaIso(valor: string): string | null {
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Converte ISO para o formato do campo de data e hora (AAAA-MM-DDTHH:mm, horário local). */
function isoParaLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

function validarPrazo(valor: string): { erro?: string; iso?: string } {
  if (!valor) return { erro: 'Informe a data e a hora limite.' };
  const iso = localParaIso(valor);
  if (!iso) return { erro: 'Data inválida.' };
  if (new Date(iso).getTime() <= Date.now()) return { erro: 'O prazo precisa ser uma data futura.' };
  return { iso };
}

interface PrazoProps {
  prazoAtual: string | null;
  rotuloBotao: string;
  aoCancelar: () => void;
  aoSalvar: (iso: string) => Promise<unknown>;
}

/** Só o prazo (editar prazo e aplicar atividade geral). */
export function FormularioDePrazo({ prazoAtual, rotuloBotao, aoCancelar, aoSalvar }: PrazoProps) {
  const [valor, setValor] = useState(isoParaLocal(prazoAtual));
  const [erro, setErro] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const r = validarPrazo(valor);
    setErro(r.erro);
    if (!r.iso) return;
    setEnviando(true);
    setErroGeral(null);
    try {
      await aoSalvar(r.iso);
    } catch (err) {
      setErroGeral(mensagemDeErro(err));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      {erroGeral && <Alerta tom="erro">{erroGeral}</Alerta>}
      <Input rotulo="Prazo de entrega" type="datetime-local" value={valor} onChange={(e) => setValor(e.target.value)} erro={erro} />
      <div className={styles.botoes}>
        <Button variante="secundario" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" carregando={enviando}>
          {rotuloBotao}
        </Button>
      </div>
    </form>
  );
}

interface Erros {
  titulo?: string;
  prazo?: string;
  tema?: string;
  tituloTema?: string;
}

interface AnexoEstado {
  url: string;
  nomeArquivo: string;
  tipoArquivo: string;
  tamanho: number;
}

export function FormularioDeTarefa({ aoCancelar, aoSalvar }: { aoCancelar: () => void; aoSalvar: () => void }) {
  const temas = useBuscar((signal) => temasService.listar(signal));
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prazo, setPrazo] = useState('');
  const [tema, setTema] = useState('');
  const [tituloTema, setTituloTema] = useState('');
  const [textoTema, setTextoTema] = useState('');
  const [imagemTema, setImagemTema] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Estado do Anexo com upload direto no Cloudinary
  const [anexo, setAnexo] = useState<AnexoEstado | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  async function aoSelecionarArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErroAnexo(null);

    const extensao = '.' + (arquivo.name.split('.').pop()?.toLowerCase() ?? '');
    const tipoMime = arquivo.type.toLowerCase();
    const ehTipoValido = TIPOS_ANEXO_VALIDOS.includes(tipoMime) || EXTENSOES_VALIDAS.includes(extensao);

    if (!ehTipoValido) {
      setErroAnexo('Formato de arquivo não suportado. Utilize PDF, PNG, JPG ou WEBP.');
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
      setAnexo({
        url: resultado.url,
        nomeArquivo: resultado.nomeArquivo,
        tipoArquivo: resultado.tipoArquivo,
        tamanho: resultado.tamanho,
      });
    } catch (err) {
      setErroAnexo(err instanceof Error ? err.message : 'Falha ao enviar arquivo para o Cloudinary.');
      if (arquivoInputRef.current) arquivoInputRef.current.value = '';
    } finally {
      setEnviandoAnexo(false);
    }
  }

  function removerAnexo() {
    setAnexo(null);
    setErroAnexo(null);
    if (arquivoInputRef.current) arquivoInputRef.current.value = '';
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const p = validarPrazo(prazo);
    const novos: Erros = {
      titulo: titulo.trim() ? undefined : 'Informe o título da tarefa.',
      prazo: p.erro,
      tema: tema ? undefined : 'Escolha um tema ou crie um novo.',
      tituloTema: tema === NOVO_TEMA && !tituloTema.trim() ? 'Informe o título do novo tema.' : undefined,
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean) || !p.iso) return;

    const dados: DadosDeTarefa = {
      tituloTarefa: titulo.trim(),
      prazoEntrega: p.iso,
      ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
      ...(tema === NOVO_TEMA
        ? {
            novoTema: {
              tituloTema: tituloTema.trim(),
              ...(textoTema.trim() ? { textoMotivador: textoTema.trim() } : {}),
              ...(imagemTema.trim() ? { imagemUrl: imagemTema.trim() } : {}),
            },
          }
        : { idTema: Number(tema) }),
    };

    setEnviando(true);
    setErroGeral(null);
    try {
      // 1. Cria a tarefa no backend
      const novaTarefa = await tutorService.criarTarefa(dados);

      // 2. Se houver anexo enviado ao Cloudinary, envia a URL para a API de Tarefas
      if (anexo) {
        try {
          await tutorService.adicionarAnexo(novaTarefa.id, {
            nomeArquivo: anexo.nomeArquivo,
            url: anexo.url,
            tipoArquivo: anexo.tipoArquivo,
          });
        } catch (errAnexo) {
          // Se a tarefa foi criada mas o anexo falhou, notifica o usuário
          console.error('Falha ao associar anexo à tarefa:', errAnexo);
          setErroGeral('A tarefa foi criada, mas não foi possível vincular o anexo à API.');
          setEnviando(false);
          return;
        }
      }

      aoSalvar();
    } catch (err) {
      if (err instanceof ApiError && err.detalhes.length > 0) setErroGeral(err.detalhes.map((d) => d.mensagem).join(' '));
      else setErroGeral(mensagemDeErro(err));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      {erroGeral && <Alerta tom="erro">{erroGeral}</Alerta>}
      <Input rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} erro={erros.titulo} placeholder="Ex.: Redação da semana" />
      <Textarea rotulo="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={5000} dica="Orientações para os alunos." />
      <Input rotulo="Prazo de entrega" type="datetime-local" value={prazo} onChange={(e) => setPrazo(e.target.value)} erro={erros.prazo} />

      {temas.carregando ? (
        <p>
          <Spinner tamanho="sm" rotulo="Carregando temas" /> Carregando temas...
        </p>
      ) : temas.erro ? (
        <Alerta tom="erro">
          {temas.erro.message}{' '}
          <button type="button" className={styles.acaoLink} onClick={temas.recarregar}>
            Tentar de novo
          </button>
        </Alerta>
      ) : (
        <Select rotulo="Tema" value={tema} onChange={(e) => setTema(e.target.value)} erro={erros.tema}>
          <option value="">Escolha um tema</option>
          {(temas.dados ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.tituloTema}
            </option>
          ))}
          <option value={NOVO_TEMA}>＋ Criar um novo tema</option>
        </Select>
      )}

      {tema === NOVO_TEMA && (
        <>
          <Input rotulo="Título do novo tema" value={tituloTema} onChange={(e) => setTituloTema(e.target.value)} maxLength={200} erro={erros.tituloTema} />
          <Textarea
            rotulo="Texto motivador (opcional)"
            value={textoTema}
            onChange={(e) => setTextoTema(e.target.value)}
            maxLength={10000}
            dica="Texto de apoio aos alunos. Digite [IMAGEM] para posicionar a imagem da coletânea no local desejado."
          />
          <Input
            rotulo="URL da Imagem Motivadora / Coletânea (opcional)"
            placeholder="https://exemplo.com/imagem-coletanea.png"
            value={imagemTema}
            onChange={(e) => setImagemTema(e.target.value)}
            maxLength={500}
            dica="URL da imagem de apoio. No texto motivador, use a tag [IMAGEM] onde ela deve aparecer."
          />
        </>
      )}

      {/* Campo de Anexo com Upload Cloudinary */}
      <div className={styles.campoAnexo}>
        <label className={styles.rotuloAnexo}>
          <span>Material de apoio / Anexo (opcional)</span>
          <span className={styles.dicaAnexo}>PDF ou imagem (PNG, JPG, WEBP) de até 10 MB</span>
        </label>

        {erroAnexo && <Alerta tom="erro">{erroAnexo}</Alerta>}

        {anexo ? (
          <div className={styles.anexoCarregado}>
            <div className={styles.infoArquivo}>
              <Paperclip size={18} className={styles.iconeArquivo} aria-hidden="true" />
              <div className={styles.detalhesArquivo}>
                <span className={styles.nomeArquivo}>{anexo.nomeArquivo}</span>
                <span className={styles.tamanhoArquivo}>
                  {(anexo.tamanho / (1024 * 1024)).toFixed(2)} MB • Pronto para envio
                </span>
              </div>
            </div>
            <Button
              type="button"
              variante="perigo"
              tamanho="sm"
              icone={<Trash2 size={14} aria-hidden="true" />}
              onClick={removerAnexo}
              disabled={enviando}
            >
              Remover
            </Button>
          </div>
        ) : (
          <div className={styles.uploadContainer}>
            <input
              ref={arquivoInputRef}
              type="file"
              id="arquivo-anexo"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={aoSelecionarArquivo}
              disabled={enviando || enviandoAnexo}
              className={styles.inputArquivoOculto}
            />
            <label htmlFor="arquivo-anexo" className={styles.botaoUpload}>
              {enviandoAnexo ? (
                <>
                  <Spinner tamanho="sm" rotulo="Enviando para o Cloudinary..." />
                  <span>Enviando para o Cloudinary...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={20} aria-hidden="true" />
                  <span>Selecionar arquivo para anexo</span>
                </>
              )}
            </label>
          </div>
        )}
      </div>

      <div className={styles.botoes}>
        <Button variante="secundario" onClick={aoCancelar} disabled={enviando || enviandoAnexo}>
          Cancelar
        </Button>
        <Button type="submit" carregando={enviando} disabled={enviandoAnexo}>
          Criar tarefa
        </Button>
      </div>
    </form>
  );
}
