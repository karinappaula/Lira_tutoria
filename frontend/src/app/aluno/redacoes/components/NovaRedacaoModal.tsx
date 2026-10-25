'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select, Textarea } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useBuscar } from '@/hooks/useBuscar';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/formatar';
import { cx } from '@/lib/cx';
import { redacoesService, temasService } from '@/services/redacoes';
import type { NovaRedacao, TarefaDoAluno } from '@/types/redacoes';
import styles from './NovaRedacaoModal.module.scss';

type Modo = 'TREINO' | 'AVALIATIVA';
const TEMA_PROPRIO = 'proprio';

interface Props {
  tarefasAbertas: TarefaDoAluno[];
  aoFechar: () => void;
}

interface Erros {
  tema?: string;
  tituloProprio?: string;
  textoProprio?: string;
  tarefa?: string;
}

export function NovaRedacaoModal({ tarefasAbertas, aoFechar }: Props) {
  const router = useRouter();
  const temas = useBuscar((signal) => temasService.listar(signal));

  const [modo, setModo] = useState<Modo>('TREINO');
  const [tema, setTema] = useState('');
  const [tituloProprio, setTituloProprio] = useState('');
  const [textoProprio, setTextoProprio] = useState('');
  const [tarefa, setTarefa] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const tarefaEscolhida = tarefasAbertas.find((t) => String(t.id) === tarefa);

  function validar(): Erros {
    const e: Erros = {};
    if (modo === 'TREINO') {
      if (!tema) e.tema = 'Escolha um tema ou escreva o seu.';
      if (tema === TEMA_PROPRIO) {
        const titulo = tituloProprio.trim();
        if (!titulo) e.tituloProprio = 'Informe o título do seu tema.';
        else if (titulo.length > 200) e.tituloProprio = 'O título pode ter no máximo 200 caracteres.';
        if (textoProprio.length > 10000) e.textoProprio = 'O texto pode ter no máximo 10.000 caracteres.';
      }
    } else if (!tarefa) {
      e.tarefa = 'Escolha a tarefa que você vai fazer.';
    }
    return e;
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados = validar();
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    let dados: NovaRedacao;
    if (modo === 'AVALIATIVA') dados = { tipoFluxo: 'AVALIATIVA', idTarefa: Number(tarefa) };
    else if (tema === TEMA_PROPRIO) {
      const motivador = textoProprio.trim();
      dados = { tipoFluxo: 'TREINO', temaProprio: { tituloTema: tituloProprio.trim(), ...(motivador ? { textoMotivador: motivador } : {}) } };
    } else dados = { tipoFluxo: 'TREINO', idTema: Number(tema) };

    setEnviando(true);
    setErroGeral(null);
    try {
      const nova = await redacoesService.criar(dados);
      router.push(`/aluno/redacoes/${nova.id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        const doTitulo = e.mensagemDoCampo('temaProprio.tituloTema');
        const doTexto = e.mensagemDoCampo('temaProprio.textoMotivador');
        if (doTitulo || doTexto) setErros({ tituloProprio: doTitulo, textoProprio: doTexto });
        else setErroGeral(e.message);
      } else setErroGeral(mensagemDeErro(e));
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo="Nova redação"
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-nova-redacao" carregando={enviando}>
            Criar e começar a escrever
          </Button>
        </>
      }
    >
      <form id="form-nova-redacao" className={styles.formulario} onSubmit={aoEnviar} noValidate>
        {erroGeral && <Alerta tom="erro">{erroGeral}</Alerta>}

        <fieldset className={styles.opcoes}>
          <legend className={styles.legenda}>O que você quer fazer?</legend>
          <label className={cx(styles.opcao, modo === 'TREINO' && styles.opcaoAtiva)}>
            <input type="radio" name="modo" value="TREINO" checked={modo === 'TREINO'} onChange={() => setModo('TREINO')} />
            <span>
              <strong>Treino livre</strong>
              <small>Escolha um tema ou escreva o seu. Não vale nota na escola.</small>
            </span>
          </label>
          <label className={cx(styles.opcao, modo === 'AVALIATIVA' && styles.opcaoAtiva)}>
            <input type="radio" name="modo" value="AVALIATIVA" checked={modo === 'AVALIATIVA'} onChange={() => setModo('AVALIATIVA')} />
            <span>
              <strong>Tarefa do meu tutor</strong>
              <small>Redação avaliativa, com prazo de entrega.</small>
            </span>
          </label>
        </fieldset>

        {modo === 'TREINO' && (
          <>
            {temas.carregando ? (
              <p className={styles.carregando}>
                <Spinner tamanho="sm" rotulo="Carregando temas" /> Carregando temas...
              </p>
            ) : temas.erro ? (
              <Alerta tom="erro">
                {temas.erro.message}{' '}
                <button type="button" className={styles.link} onClick={temas.recarregar}>
                  Tentar de novo
                </button>
              </Alerta>
            ) : (
              <Select
                rotulo="Tema"
                value={tema}
                onChange={(e) => {
                  setTema(e.target.value);
                  setErros({});
                }}
                erro={erros.tema}
              >
                <option value="">Escolha um tema</option>
                {(temas.dados ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tituloTema}
                  </option>
                ))}
                <option value={TEMA_PROPRIO}>✎ Escrever o meu próprio tema</option>
              </Select>
            )}

            {tema === TEMA_PROPRIO && (
              <>
                <Input
                  rotulo="Título do seu tema"
                  value={tituloProprio}
                  onChange={(e) => setTituloProprio(e.target.value)}
                  maxLength={200}
                  erro={erros.tituloProprio}
                  placeholder="Ex.: Os desafios do transporte público"
                />
                <Textarea
                  rotulo="Texto motivador (opcional)"
                  value={textoProprio}
                  onChange={(e) => setTextoProprio(e.target.value)}
                  erro={erros.textoProprio}
                  dica="Cole aqui trechos de apoio, se tiver."
                />
              </>
            )}
          </>
        )}

        {modo === 'AVALIATIVA' &&
          (tarefasAbertas.length === 0 ? (
            <Alerta tom="info">Você não tem tarefas abertas no momento. Quando seu tutor criar uma, ela aparece aqui.</Alerta>
          ) : (
            <>
              <Select rotulo="Tarefa" value={tarefa} onChange={(e) => setTarefa(e.target.value)} erro={erros.tarefa}>
                <option value="">Escolha a tarefa</option>
                {tarefasAbertas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tituloTarefa}
                  </option>
                ))}
              </Select>
              {tarefaEscolhida && (
                <p className={styles.resumo}>
                  {tarefaEscolhida.tema && <span>Tema: {tarefaEscolhida.tema.tituloTema}</span>}
                  <span>Entrega até {formatarDataHora(tarefaEscolhida.prazoEntrega)}</span>
                </p>
              )}
            </>
          ))}
      </form>
    </Modal>
  );
}