'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Select } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { mensagemDeErro } from '@/lib/erros';
import { adminService, type UsuarioTutorItem } from '@/services/admin';
import styles from './TurmasAdmin.module.scss';

interface Props {
  aluno: { idUsuario: number; nome: string; idTutorAtual?: number } | null;
  aberto: boolean;
  aoFechar: () => void;
  aoSucesso: () => void;
}

export function ModalTransferirAluno({ aluno, aberto, aoFechar, aoSucesso }: Props) {
  const toast = useToast();
  const [tutores, setTutores] = useState<UsuarioTutorItem[]>([]);
  const [carregandoTutores, setCarregandoTutores] = useState(false);
  const [idTutorDestino, setIdTutorDestino] = useState<string>('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto || !aluno) return;
    setErro(null);
    setIdTutorDestino('');
    setCarregandoTutores(true);

    adminService
      .usuariosTutores()
      .then((lista) => {
        // Filtra tutores ativos diferentes do tutor atual do aluno
        const elegiveis = lista.filter(
          (u) => u.status === 'ATIVO' && u.id !== aluno.idTutorAtual
        );
        setTutores(elegiveis);
        if (elegiveis.length > 0 && elegiveis[0]) {
          setIdTutorDestino(String(elegiveis[0].id));
        }
      })
      .catch((e) => {
        setErro(mensagemDeErro(e));
      })
      .finally(() => {
        setCarregandoTutores(false);
      });
  }, [aberto, aluno]);

  if (!aluno) return null;

  async function executarTransferencia() {
    if (!idTutorDestino) {
      setErro('Selecione um novo tutor.');
      return;
    }
    const idTutorNum = Number(idTutorDestino);
    setSalvando(true);
    setErro(null);
    try {
      await adminService.transferirAluno(aluno!.idUsuario, idTutorNum);
      toast.sucesso(`Aluno ${aluno!.nome} remanejado com sucesso!`);
      aoSucesso();
      aoFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const tutorDestinoObj = tutores.find((t) => t.id === Number(idTutorDestino));
  const alunosNoDestino = tutorDestinoObj?.tutor?._count?.alunos ?? 0;
  const vagasDestino = Math.max(0, 10 - alunosNoDestino);

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Remanejar Aluno para Novo Tutor"
      tamanho="md"
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            icone={<ArrowRightLeft size={16} aria-hidden="true" />}
            carregando={salvando}
            disabled={salvando || carregandoTutores || tutores.length === 0 || vagasDestino <= 0}
            onClick={() => void executarTransferencia()}
          >
            Confirmar transferência
          </Button>
        </>
      }
    >
      <div className={styles.formulario}>
        {erro && <Alerta tom="erro">{erro}</Alerta>}

        <p className={styles.textoInstrucao}>
          Selecione o novo tutor responsável pelo aluno <strong>{aluno.nome}</strong>. O histórico
          de redações e notas do aluno será mantido.
        </p>

        {carregandoTutores ? (
          <Spinner rotulo="Carregando tutores disponíveis..." />
        ) : tutores.length === 0 ? (
          <Alerta tom="alerta">
            Não há outros tutores ativos disponíveis para transferência no momento.
          </Alerta>
        ) : (
          <>
            <Select
              rotulo="Novo Tutor Responsável"
              value={idTutorDestino}
              onChange={(e) => setIdTutorDestino(e.target.value)}
            >
              {tutores.map((t) => {
                const totalAlunos = t.tutor?._count?.alunos ?? 0;
                const turmaNome = t.tutor?.turma?.nome ?? 'Sem turma';
                return (
                  <option
                    key={t.id}
                    value={String(t.id)}
                    disabled={totalAlunos >= 10}
                  >
                    {t.nome} ({turmaNome}) — {totalAlunos}/10 alunos
                    {totalAlunos >= 10 ? ' (Limite de 10 atingido)' : ''}
                  </option>
                );
              })}
            </Select>

            {tutorDestinoObj && (
              <div className={styles.infoCapacidade}>
                <span>Vagas disponíveis com este tutor:</span>
                <strong>{vagasDestino} de 10 vagas</strong>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
