'use client';

import { useState, type FormEvent } from 'react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select, Textarea } from '@/components/ui/Campos/Campos';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useBuscar } from '@/hooks/useBuscar';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { temasService } from '@/services/redacoes';
import { tutorService, type DadosDeTarefa } from '@/services/tutor';
import styles from './Tutor.module.scss';

const NOVO_TEMA = 'novo';

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

export function FormularioDeTarefa({ aoCancelar, aoSalvar }: { aoCancelar: () => void; aoSalvar: () => void }) {
  const temas = useBuscar((signal) => temasService.listar(signal));
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prazo, setPrazo] = useState('');
  const [tema, setTema] = useState('');
  const [tituloTema, setTituloTema] = useState('');
  const [textoTema, setTextoTema] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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
        ? { novoTema: { tituloTema: tituloTema.trim(), ...(textoTema.trim() ? { textoMotivador: textoTema.trim() } : {}) } }
        : { idTema: Number(tema) }),
    };

    setEnviando(true);
    setErroGeral(null);
    try {
      await tutorService.criarTarefa(dados);
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
          <Textarea rotulo="Texto motivador (opcional)" value={textoTema} onChange={(e) => setTextoTema(e.target.value)} maxLength={10000} />
        </>
      )}

      <div className={styles.botoes}>
        <Button variante="secundario" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" carregando={enviando}>
          Criar tarefa
        </Button>
      </div>
    </form>
  );
}