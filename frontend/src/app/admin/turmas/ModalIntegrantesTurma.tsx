'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, GraduationCap, UserCheck, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { mensagemDeErro } from '@/lib/erros';
import { adminService, type TurmaAdmin, type TurmaDetalhada } from '@/services/admin';
import { ModalTransferirAluno } from './ModalTransferirAluno';
import { ModalTransferirTutor } from './ModalTransferirTutor';
import styles from './TurmasAdmin.module.scss';

interface Props {
  turma: TurmaAdmin | null;
  aberto: boolean;
  aoFechar: () => void;
  aoAbrirConvite: (turma: TurmaAdmin) => void;
  aoAtualizarTurma: () => void;
}

export function ModalIntegrantesTurma({
  turma,
  aberto,
  aoFechar,
  aoAbrirConvite,
  aoAtualizarTurma,
}: Props) {
  const [detalhes, setDetalhes] = useState<TurmaDetalhada | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados dos sub-modais de remanejamento
  const [tutorRemanejar, setTutorRemanejar] = useState<{
    idUsuario: number;
    nome: string;
    turmaAtualId?: number;
  } | null>(null);
  const [alunoRemanejar, setAlunoRemanejar] = useState<{
    idUsuario: number;
    nome: string;
    idTutorAtual?: number;
  } | null>(null);

  function carregarDados() {
    if (!turma) return;
    setCarregando(true);
    setErro(null);
    adminService
      .obterTurma(turma.id)
      .then((res) => {
        setDetalhes(res);
      })
      .catch((e) => {
        setErro(mensagemDeErro(e));
      })
      .finally(() => {
        setCarregando(false);
      });
  }

  useEffect(() => {
    if (aberto && turma) {
      carregarDados();
    }
  }, [aberto, turma]);

  if (!turma) return null;

  const tutores = detalhes?.tutores ?? [];
  const totalAlunos = tutores.reduce((acc, t) => acc + (t.alunos?.length ?? 0), 0);

  return (
    <>
      <Modal
        aberto={aberto}
        aoFechar={aoFechar}
        titulo={`Integrantes: ${turma.nome}`}
        tamanho="lg"
        rodape={
          <div className={styles.rodapeIntegrantes}>
            <div className={styles.resumoIntegrantes}>
              <span>{tutores.length}/6 Tutores</span>
              <span>·</span>
              <span>{totalAlunos} Alunos</span>
            </div>
            <div className={styles.acoesRodape}>
              <Button
                variante="secundario"
                tamanho="sm"
                icone={<UserPlus size={16} aria-hidden="true" />}
                onClick={() => {
                  aoFechar();
                  aoAbrirConvite(turma);
                }}
                disabled={turma.status !== 'ATIVA' || tutores.length >= 6}
              >
                Convidar tutores
              </Button>
              <Button onClick={aoFechar}>Fechar</Button>
            </div>
          </div>
        }
      >
        <div className={styles.conteudoIntegrantes}>
          <div className={styles.cabecalhoTurmaInfo}>
            <div className={styles.turmaBadges}>
              <Badge tom="neutro">{turma.vestibularFoco}</Badge>
              <Badge tom={turma.status === 'ATIVA' ? 'sucesso' : 'alerta'}>
                {turma.status}
              </Badge>
              <span className={styles.anoTexto}>Ano Letivo: {turma.anoLetivo}</span>
            </div>
          </div>

          {carregando ? (
            <CarregandoPagina rotulo="Carregando tutores e alunos vinculados..." />
          ) : erro ? (
            <ErrorState mensagem={erro} aoTentarNovamente={carregarDados} />
          ) : tutores.length === 0 ? (
            <EmptyState
              titulo="Nenhum tutor vinculado nesta turma"
              descricao="Gere um convite de tutor para associar tutores e iniciar as turmas."
              acao={
                <Button
                  variante="primario"
                  icone={<UserPlus size={16} aria-hidden="true" />}
                  onClick={() => {
                    aoFechar();
                    aoAbrirConvite(turma);
                  }}
                  disabled={turma.status !== 'ATIVA'}
                >
                  Gerar convite de tutor
                </Button>
              }
            />
          ) : (
            <div className={styles.listaTutores}>
              {tutores.map((tutor) => {
                const alunos = tutor.alunos ?? [];
                return (
                  <div key={tutor.idUsuario} className={styles.cardTutor}>
                    <div className={styles.topoTutor}>
                      <div className={styles.dadosTutor}>
                        <div className={styles.avatarTutor}>
                          <GraduationCap size={18} aria-hidden="true" />
                        </div>
                        <div>
                          <strong className={styles.nomeTutor}>{tutor.usuario.nome}</strong>
                          <span className={styles.emailTutor}>{tutor.usuario.email}</span>
                        </div>
                      </div>

                      <div className={styles.acoesTutor}>
                        <Badge tom={alunos.length >= 10 ? 'perigo' : 'sucesso'}>
                          {alunos.length}/10 Alunos
                        </Badge>
                        <Button
                          variante="secundario"
                          tamanho="sm"
                          icone={<ArrowRightLeft size={14} aria-hidden="true" />}
                          onClick={() =>
                            setTutorRemanejar({
                              idUsuario: tutor.idUsuario,
                              nome: tutor.usuario.nome,
                              turmaAtualId: turma.id,
                            })
                          }
                          aria-label={`Remanejar tutor ${tutor.usuario.nome}`}
                        >
                          Transferir
                        </Button>
                      </div>
                    </div>

                    <div className={styles.secaoAlunos}>
                      <h4 className={styles.tituloAlunos}>
                        <Users size={14} aria-hidden="true" /> Alunos sob responsabilidade ({alunos.length}):
                      </h4>

                      {alunos.length === 0 ? (
                        <p className={styles.nenhumAluno}>Nenhum aluno vinculado a este tutor ainda.</p>
                      ) : (
                        <ul className={styles.gradeAlunos}>
                          {alunos.map((aluno) => (
                            <li key={aluno.idUsuario} className={styles.itemAluno}>
                              <div className={styles.infoAluno}>
                                <div className={styles.avatarAluno}>
                                  <UserCheck size={14} aria-hidden="true" />
                                </div>
                                <div className={styles.textosAluno}>
                                  <strong>{aluno.usuario.nome}</strong>
                                  <span>{aluno.usuario.email}</span>
                                </div>
                              </div>
                              <Button
                                variante="secundario"
                                tamanho="sm"
                                icone={<ArrowRightLeft size={13} aria-hidden="true" />}
                                onClick={() =>
                                  setAlunoRemanejar({
                                    idUsuario: aluno.idUsuario,
                                    nome: aluno.usuario.nome,
                                    idTutorAtual: tutor.idUsuario,
                                  })
                                }
                                aria-label={`Remanejar aluno ${aluno.usuario.nome}`}
                              >
                                Remanejar
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Modais de Remanejamento */}
      <ModalTransferirTutor
        tutor={tutorRemanejar}
        aberto={Boolean(tutorRemanejar)}
        aoFechar={() => setTutorRemanejar(null)}
        aoSucesso={() => {
          carregarDados();
          aoAtualizarTurma();
        }}
      />

      <ModalTransferirAluno
        aluno={alunoRemanejar}
        aberto={Boolean(alunoRemanejar)}
        aoFechar={() => setAlunoRemanejar(null)}
        aoSucesso={() => {
          carregarDados();
          aoAtualizarTurma();
        }}
      />
    </>
  );
}
