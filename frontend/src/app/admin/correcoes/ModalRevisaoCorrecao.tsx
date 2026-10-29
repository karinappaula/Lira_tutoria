'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { TextoMarcado } from '@/components/redacao/TextoMarcado';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Textarea } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { cx } from '@/lib/cx';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/formatar';
import { COMPETENCIAS, descricaoDoNivel, infoDoTipo, TIPOS_DE_ERRO } from '@/lib/rubrica';
import { adminService, type CorrecaoPendenteItem } from '@/services/admin';
import marcadoStyles from '@/components/redacao/TextoMarcado.module.scss';
import styles from './ModalRevisaoCorrecao.module.scss';

interface Props {
  correcao: CorrecaoPendenteItem | null;
  aberto: boolean;
  aoFechar: () => void;
  aoSucesso: () => void;
}

type AbaMobile = 'texto' | 'notas';

export function ModalRevisaoCorrecao({ correcao, aberto, aoFechar, aoSucesso }: Props) {
  const toast = useToast();
  const [abaMobile, setAbaMobile] = useState<AbaMobile>('texto');
  const [marcaAtiva, setMarcaAtiva] = useState<number | null>(null);

  // Estados de ação administrativa
  const [modoAjuste, setModoAjuste] = useState(false);
  const [comentarioAjuste, setComentarioAjuste] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Fecha e reseta estados ao sair
  function fecharModal() {
    setModoAjuste(false);
    setComentarioAjuste('');
    setErro(null);
    setMarcaAtiva(null);
    aoFechar();
  }

  // Prepara as marcas visuais para o TextoMarcado
  const marcas = useMemo(() => {
    if (!correcao?.anotacoes) return [];
    return correcao.anotacoes.map((a) => ({
      chave: a.id,
      inicio: a.posicaoInicio,
      fim: a.posicaoFinal,
      tipoErro: a.tipoErro,
    }));
  }, [correcao?.anotacoes]);

  // Anotação atualmente selecionada
  const anotacaoAtiva = useMemo(() => {
    if (!correcao || marcaAtiva === null) return null;
    return correcao.anotacoes.find((a) => a.id === marcaAtiva);
  }, [correcao, marcaAtiva]);

  // Tipos presentes no texto para a legenda
  const tiposPresentes = useMemo(() => {
    if (!correcao?.anotacoes) return [];
    return TIPOS_DE_ERRO.filter((t) =>
      correcao.anotacoes.some((a) => infoDoTipo(a.tipoErro).estilo === t.estilo)
    );
  }, [correcao?.anotacoes]);

  if (!correcao) return null;

  const alunoNome = correcao.versao.redacao.aluno.usuario.nome;
  const tutorNome = correcao.tutor.usuario.nome;
  const turmaNome =
    correcao.versao.redacao.aluno.tutor?.turma?.nome ?? 'Turma Vinculada';
  const temaTitulo =
    correcao.versao.redacao.tema?.tituloTema ??
    correcao.versao.redacao.tarefa?.tituloTarefa ??
    'Tema Geral de Redação';
  const numeroVersao = correcao.versao.numeroVersao;
  const textoRedacao = correcao.versao.conteudoTexto;
  const notaTotalNum = Number(correcao.notaTotal) || 0;

  const listaCompetencias = [
    {
      numero: 1,
      nota: Number(correcao.notaComp1) || 0,
      comentario: correcao.comentarioComp1,
    },
    {
      numero: 2,
      nota: Number(correcao.notaComp2) || 0,
      comentario: correcao.comentarioComp2,
    },
    {
      numero: 3,
      nota: Number(correcao.notaComp3) || 0,
      comentario: correcao.comentarioComp3,
    },
    {
      numero: 4,
      nota: Number(correcao.notaComp4) || 0,
      comentario: correcao.comentarioComp4,
    },
    {
      numero: 5,
      nota: Number(correcao.notaComp5) || 0,
      comentario: correcao.comentarioComp5,
    },
  ];

  async function executarAprovacao() {
    setProcessando(true);
    setErro(null);
    try {
      await adminService.aprovarCorrecao(correcao!.id);
      toast.sucesso(`Correção da redação de ${alunoNome} aprovada com sucesso!`);
      aoSucesso();
      fecharModal();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  async function executarSolicitacaoAjuste() {
    if (!comentarioAjuste.trim()) {
      setErro('Informe uma observação detalhando o ajuste necessário para o tutor.');
      return;
    }
    setProcessando(true);
    setErro(null);
    try {
      await adminService.solicitarAjuste(correcao!.id, comentarioAjuste.trim());
      toast.sucesso(`Ajuste solicitado com sucesso ao tutor ${tutorNome}.`);
      aoSucesso();
      fecharModal();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={fecharModal}
      titulo={`Revisão de Correção: ${alunoNome}`}
      tamanho="xl"
      rodape={
        <div className={styles.rodapeModal}>
          <Button
            variante="secundario"
            onClick={fecharModal}
            disabled={processando}
          >
            {modoAjuste ? 'Cancelar solicitação' : 'Fechar'}
          </Button>

          <div className={styles.acoesPrimarias}>
            {modoAjuste ? (
              <Button
                variante="perigo"
                carregando={processando}
                icone={<RotateCcw size={16} aria-hidden="true" />}
                onClick={() => void executarSolicitacaoAjuste()}
              >
                Enviar solicitação de ajuste
              </Button>
            ) : (
              <>
                <Button
                  variante="secundario"
                  icone={<AlertTriangle size={16} aria-hidden="true" />}
                  onClick={() => setModoAjuste(true)}
                  disabled={processando}
                >
                  Solicitar ajuste
                </Button>
                <Button
                  variante="primario"
                  icone={<CheckCircle2 size={16} aria-hidden="true" />}
                  carregando={processando}
                  onClick={() => void executarAprovacao()}
                >
                  Aprovar correção
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className={styles.modalRevisao}>
        {erro && <Alerta tom="erro">{erro}</Alerta>}

        {/* Metadados Superiores */}
        <div className={styles.cabecalhoMeta}>
          <div className={styles.tagsMeta}>
            <Badge tom="neutro">{turmaNome}</Badge>
            <Badge tom="sucesso">Versão {numeroVersao}</Badge>
            <Badge tom="alerta">Pendente de Revisão</Badge>
            {correcao.numeroAjuste > 0 && (
              <Badge tom="alerta">Reenvio #{correcao.numeroAjuste}</Badge>
            )}
          </div>
          <span className={styles.tutorMeta}>
            Tutor avaliador: <strong>{tutorNome}</strong> · Enviada em {formatarDataHora(correcao.dataCorrecao)}
          </span>
        </div>

        {/* Caixa de Solicitação de Ajuste (quando ativada) */}
        {modoAjuste && (
          <div className={styles.caixaSolicitacaoAjuste} role="region" aria-label="Solicitação de ajuste ao tutor">
            <h4 className={styles.tituloAjuste}>
              <RotateCcw size={16} aria-hidden="true" /> Devolver correção para ajuste pelo tutor
            </h4>
            <p className={styles.instrucaoAjuste}>
              Explique detalhadamente quais critérios ou pareceres devem ser reavaliados pelo tutor{' '}
              <strong>{tutorNome}</strong> antes que a nota seja liberada para o aluno.
            </p>
            <Textarea
              rotulo="Observação para o Tutor (Obrigatório)"
              value={comentarioAjuste}
              onChange={(e) => setComentarioAjuste(e.target.value)}
              placeholder="Exemplo: Na competência 1, foram identificados outros dois desvios de regência verbal no terceiro parágrafo. Favor reavaliar a nota de C1 e complementar a explicação..."
              rows={4}
              required
            />
          </div>
        )}

        {/* Alternador de Abas Mobile */}
        <div className={styles.abasMobile} role="tablist" aria-label="Seções da revisão">
          <button
            type="button"
            className={abaMobile === 'texto' ? styles.abaAtiva : styles.abaBotao}
            onClick={() => setAbaMobile('texto')}
            role="tab"
            aria-selected={abaMobile === 'texto'}
          >
            <FileText size={16} aria-hidden="true" />
            <span>Texto e Marcações</span>
          </button>
          <button
            type="button"
            className={abaMobile === 'notas' ? styles.abaAtiva : styles.abaBotao}
            onClick={() => setAbaMobile('notas')}
            role="tab"
            aria-selected={abaMobile === 'notas'}
          >
            <Award size={16} aria-hidden="true" />
            <span>Notas e Parecer</span>
          </button>
        </div>

        {/* Grade de Painéis Duplos (Desktop: lado a lado; Mobile: controlado por abas) */}
        <div className={styles.gradePaineis}>
          {/* Painel Esquerdo: Texto Original da Redação */}
          <div
            className={cx(
              styles.colunaTexto,
              abaMobile !== 'texto' && styles.ocultoMobile
            )}
          >
            <div className={styles.cardTexto}>
              <div className={styles.topoTexto}>
                <h3 className={styles.tituloSecao}>
                  <FileText size={16} aria-hidden="true" /> Texto da Redação
                </h3>
                <p className={styles.temaRedacao}>Tema: {temaTitulo}</p>
              </div>

              {tiposPresentes.length > 0 && (
                <ul className={styles.legenda} aria-label="Legenda de tipos de erro marcados">
                  {tiposPresentes.map((tipo) => (
                    <li key={tipo.valor}>
                      <span
                        className={cx(
                          marcadoStyles.marca,
                          marcadoStyles[tipo.estilo],
                          styles.amostraCor
                        )}
                      >
                        Aa
                      </span>
                      <span>{tipo.valor}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.areaTextoMarcado}>
                <TextoMarcado
                  texto={textoRedacao}
                  marcas={marcas}
                  marcaAtiva={marcaAtiva}
                  aoClicarMarca={(m) =>
                    setMarcaAtiva((atual) => (atual === m.chave ? null : Number(m.chave)))
                  }
                  rotulo="Texto da redação com marcações ortográficas e gramaticais do tutor"
                />
              </div>

              {anotacaoAtiva ? (
                <div className={styles.detalheMarcacao} role="status">
                  <p className={styles.tipoMarcacao}>
                    {infoDoTipo(anotacaoAtiva.tipoErro).valor}
                    {infoDoTipo(anotacaoAtiva.tipoErro).competencia && (
                      <span> · Competência {infoDoTipo(anotacaoAtiva.tipoErro).competencia}</span>
                    )}
                  </p>
                  <p className={styles.trechoMarcado}>“{anotacaoAtiva.textoSelecionado}”</p>
                  <p className={styles.sugestaoMarcacao}>
                    <strong>Observação do tutor:</strong>{' '}
                    {anotacaoAtiva.sugestaoComentario || 'Sem comentário específico para este trecho.'}
                  </p>
                </div>
              ) : (
                correcao.anotacoes.length > 0 && (
                  <p className={styles.dicaClique}>
                    Toque ou clique em qualquer trecho marcado acima para inspecionar os detalhes do apontamento.
                  </p>
                )
              )}
            </div>
          </div>

          {/* Painel Direito: Avaliação, Competências e Parecer */}
          <div
            className={cx(
              styles.colunaNotas,
              abaMobile !== 'notas' && styles.ocultoMobile
            )}
          >
            {/* Nota Final */}
            <div className={styles.cardNotaGeral}>
              <div>
                <p className={styles.rotuloNotaGeral}>Nota Total Sugerida</p>
                <p className={styles.valorNotaGeral}>
                  {notaTotalNum} <span>/ 1000</span>
                </p>
              </div>
              <Badge tom="sucesso">Avaliativa</Badge>
            </div>

            {/* Recado do Tutor para a Administração (se houver) */}
            {correcao.recadoAdmin && (
              <div className={styles.cardRecadoAdmin}>
                <strong>Recado Interno do Tutor para a Administração:</strong>
                <p>{correcao.recadoAdmin}</p>
              </div>
            )}

            {/* Competências C1 a C5 */}
            <div className={styles.listaCompetencias}>
              {listaCompetencias.map((comp) => {
                const info = COMPETENCIAS.find((c) => c.numero === comp.numero);
                return (
                  <div key={comp.numero} className={styles.cardCompetencia}>
                    <div className={styles.topoCompetencia}>
                      <h4>
                        C{comp.numero} · {info?.nome}
                      </h4>
                      <strong>{comp.nota} / 200</strong>
                    </div>

                    <div
                      className={styles.barraNivel}
                      role="progressbar"
                      aria-valuenow={comp.nota}
                      aria-valuemin={0}
                      aria-valuemax={200}
                    >
                      <span style={{ width: `${(comp.nota / 200) * 100}%` }} />
                    </div>

                    <p className={styles.descNivel}>
                      {descricaoDoNivel(comp.numero, comp.nota)}
                    </p>

                    <p className={styles.comentarioCompetencia}>
                      <strong>Comentário:</strong> {comp.comentario || 'Sem justificativa redigida.'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Parecer Geral */}
            {correcao.parecerGeral && (
              <div className={styles.cardParecerGeral}>
                <h4>
                  <Sparkles size={16} aria-hidden="true" /> Parecer Geral do Tutor
                </h4>
                <p>{correcao.parecerGeral}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
