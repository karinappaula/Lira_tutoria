'use client';

import { useState } from 'react';
import { Calendar, Eye, Paperclip, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/formatar';
import { prazoEncerrado, urlSegura } from '@/lib/redacoes';
import { tutorService } from '@/services/tutor';
import type { TarefaDoTutor } from '@/types/correcoes';
import { FormularioDePrazo, FormularioDeTarefa } from './FormulariosDeTarefa';
import styles from './Tutor.module.scss';

type Janela = { tipo: 'nova' } | { tipo: 'detalhes' | 'prazo' | 'remover' | 'aplicar'; tarefa: TarefaDoTutor } | null;

export function TarefasDoTutor() {
  const toast = useToast();
  const { dados, carregando, erro, recarregar } = useBuscar((signal) => tutorService.tarefas(signal));
  const [janela, setJanela] = useState<Janela>(null);
  const [removendo, setRemovendo] = useState(false);

  const minhas = (dados ?? []).filter((t) => t.modalidade === 'AVALIATIVA');
  const gerais = (dados ?? []).filter((t) => t.modalidade === 'GERAL');
  const fechar = () => setJanela(null);
  const aposSalvar = (mensagem: string) => {
    toast.sucesso(mensagem);
    fechar();
    recarregar();
  };

  async function remover(tarefa: TarefaDoTutor) {
    setRemovendo(true);
    try {
      await tutorService.excluirTarefa(tarefa.id);
      aposSalvar('Tarefa removida.');
    } catch (e) {
      toast.erro(mensagemDeErro(e));
    } finally {
      setRemovendo(false);
    }
  }

  const colunas: Coluna<TarefaDoTutor>[] = [
    {
      chave: 'titulo',
      titulo: 'Título',
      celula: (t) => (
        <div className={styles.dupla}>
          <strong>{t.tituloTarefa}</strong>
          {prazoEncerrado(t.prazoEntrega) && <Badge tom="perigo">Prazo encerrado</Badge>}
        </div>
      ),
    },
    { chave: 'tema', titulo: 'Tema', celula: (t) => t.tema?.tituloTema ?? '—' },
    { chave: 'prazo', titulo: 'Prazo', celula: (t) => formatarDataHora(t.prazoEntrega) },
    {
      chave: 'progresso',
      titulo: 'Progresso',
      celula: (t) =>
        t.progresso ? (
          <div className={styles.progresso}>
            <strong>{`${t.progresso.concluidas} de ${t.progresso.totalTutorados} concluíram`}</strong>
            <small>{`${t.progresso.emCorrecao} ${t.progresso.emCorrecao === 1 ? 'entregue' : 'entregues'} em correção/revisão`}</small>
          </div>
        ) : (
          '—'
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
            icone={<Calendar size={15} aria-hidden="true" />}
            onClick={() => setJanela({ tipo: 'prazo', tarefa: t })}
          >
            Editar prazo
          </Button>
          <Button
            variante="perigo"
            tamanho="sm"
            icone={<Trash2 size={15} aria-hidden="true" />}
            onClick={() => setJanela({ tipo: 'remover', tarefa: t })}
          >
            Remover
          </Button>
        </div>
      ),
    },
  ];

  const colunasGerais: Coluna<TarefaDoTutor>[] = [
    { chave: 'titulo', titulo: 'Atividade', celula: (t) => <strong>{t.tituloTarefa}</strong> },
    { chave: 'tema', titulo: 'Tema', celula: (t) => t.tema?.tituloTema ?? '—' },
    {
      chave: 'acao',
      titulo: 'Ação',
      alinhamento: 'direita',
      noCartao: 'acoes',
      celula: (t) => (
        <Button variante="secundario" tamanho="sm" onClick={() => setJanela({ tipo: 'aplicar', tarefa: t })}>
          Aplicar ao meu grupo
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Tarefas"
        descricao="Gerencie as tarefas de redação e acompanhe as entregas."
        acao={
          <div className={styles.grupoBotoesHeader}>
            <Button icone={<Plus size={18} aria-hidden="true" />} onClick={() => setJanela({ tipo: 'nova' })}>
              Nova tarefa
            </Button>
          </div>
        }
      />

      {carregando ? (
        <CarregandoPagina rotulo="Carregando as tarefas" />
      ) : erro ? (
        <ErrorState mensagem={erro.message} conexao={erro.ehErroDeConexao} aoTentarNovamente={recarregar} />
      ) : (
        <div className={styles.secoes}>
          <section aria-labelledby="titulo-minhas">
            <h2 id="titulo-minhas" className={styles.subtitulo}>
              Tarefas do meu grupo
            </h2>
            {minhas.length === 0 ? (
              <div className={styles.vazio}>
                <EmptyState titulo="Você ainda não criou tarefas" descricao='Use "Nova tarefa" ou aplique uma atividade geral da Administração.' />
              </div>
            ) : (
              <Tabela colunas={colunas} linhas={minhas} chaveDaLinha={(t) => t.id} descricao="Tarefas criadas por você" />
            )}
          </section>

          {gerais.length > 0 && (
            <section aria-labelledby="titulo-gerais">
              <h2 id="titulo-gerais" className={styles.subtitulo}>
                Atividades gerais da Administração
              </h2>
              <Tabela colunas={colunasGerais} linhas={gerais} chaveDaLinha={(t) => t.id} descricao="Atividades gerais que você pode aplicar ao seu grupo" />
            </section>
          )}
        </div>
      )}

      <Modal aberto={janela?.tipo === 'nova'} aoFechar={fechar} titulo="Nova tarefa">
        {janela?.tipo === 'nova' && <FormularioDeTarefa aoCancelar={fechar} aoSalvar={() => aposSalvar('Tarefa criada para o seu grupo.')} />}
      </Modal>

      <Modal aberto={janela?.tipo === 'prazo'} aoFechar={fechar} titulo="Editar prazo">
        {janela?.tipo === 'prazo' && (
          <FormularioDePrazo
            prazoAtual={janela.tarefa.prazoEntrega}
            rotuloBotao="Salvar prazo"
            aoCancelar={fechar}
            aoSalvar={(iso) => tutorService.alterarPrazo(janela.tarefa.id, iso).then(() => aposSalvar('Prazo atualizado.'))}
          />
        )}
      </Modal>

      <Modal aberto={janela?.tipo === 'aplicar'} aoFechar={fechar} titulo="Aplicar atividade ao meu grupo">
        {janela?.tipo === 'aplicar' && (
          <>
            <p className={styles.dica}>
              A atividade <strong>{janela.tarefa.tituloTarefa}</strong> vira uma tarefa sua. Informe até quando seus alunos podem entregar.
            </p>
            <FormularioDePrazo
              prazoAtual={null}
              rotuloBotao="Aplicar"
              aoCancelar={fechar}
              aoSalvar={(iso) => tutorService.aplicarAtividadeGeral(janela.tarefa.id, iso).then(() => aposSalvar('Atividade aplicada ao seu grupo.'))}
            />
          </>
        )}
      </Modal>

      <Modal
        aberto={janela?.tipo === 'remover'}
        aoFechar={fechar}
        titulo="Remover tarefa?"
        rodape={
          <>
            <Button variante="secundario" disabled={removendo} onClick={fechar}>
              Cancelar
            </Button>
            <Button variante="perigo" carregando={removendo} onClick={() => janela?.tipo === 'remover' && void remover(janela.tarefa)}>
              Remover
            </Button>
          </>
        }
      >
        <p>
          A tarefa <strong>{janela?.tipo === 'remover' ? janela.tarefa.tituloTarefa : ''}</strong> será removida. Se algum aluno já iniciou uma redação nela, o sistema não permite remover.
        </p>
      </Modal>

      <Modal aberto={janela?.tipo === 'detalhes'} aoFechar={fechar} titulo={janela?.tipo === 'detalhes' ? janela.tarefa.tituloTarefa : 'Detalhes'}>
        {janela?.tipo === 'detalhes' && (
          <div className={styles.detalhes}>
            <p>
              <strong>Tema:</strong> {janela.tarefa.tema?.tituloTema ?? '—'}
            </p>
            <p>
              <strong>Prazo:</strong> {formatarDataHora(janela.tarefa.prazoEntrega)}
            </p>
            {janela.tarefa.descricao && <p>{janela.tarefa.descricao}</p>}
            {janela.tarefa.anexos.length > 0 && (
              <ul className={styles.dupla}>
                {janela.tarefa.anexos.map((a) => {
                  const url = urlSegura(a.caminhoArquivo);
                  return (
                    <li key={a.id}>
                      <Paperclip size={14} aria-hidden="true" />{' '}
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {a.nomeArquivo}
                        </a>
                      ) : (
                        a.nomeArquivo
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
