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
import { adminService, type TurmaAdmin } from '@/services/admin';
import styles from './TurmasAdmin.module.scss';

interface Props {
  tutor: { idUsuario: number; nome: string; turmaAtualId?: number } | null;
  aberto: boolean;
  aoFechar: () => void;
  aoSucesso: () => void;
}

export function ModalTransferirTutor({ tutor, aberto, aoFechar, aoSucesso }: Props) {
  const toast = useToast();
  const [turmas, setTurmas] = useState<TurmaAdmin[]>([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);
  const [idTurmaDestino, setIdTurmaDestino] = useState<string>('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto || !tutor) return;
    setErro(null);
    setIdTurmaDestino('');
    setCarregandoTurmas(true);

    adminService
      .turmas()
      .then((lista) => {
        // Filtra turmas ativas diferentes da turma atual do tutor
        const elegiveis = lista.filter(
          (t) => t.status === 'ATIVA' && t.id !== tutor.turmaAtualId
        );
        setTurmas(elegiveis);
        if (elegiveis.length > 0 && elegiveis[0]) {
          setIdTurmaDestino(String(elegiveis[0].id));
        }
      })
      .catch((e) => {
        setErro(mensagemDeErro(e));
      })
      .finally(() => {
        setCarregandoTurmas(false);
      });
  }, [aberto, tutor]);

  if (!tutor) return null;

  async function executarTransferencia() {
    if (!idTurmaDestino) {
      setErro('Selecione uma turma de destino.');
      return;
    }
    const idTurmaNum = Number(idTurmaDestino);
    setSalvando(true);
    setErro(null);
    try {
      await adminService.transferirTutor(tutor!.idUsuario, idTurmaNum);
      toast.sucesso(`Tutor ${tutor!.nome} remanejado com sucesso!`);
      aoSucesso();
      aoFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const turmaDestinoObj = turmas.find((t) => t.id === Number(idTurmaDestino));
  const vagasDestino = turmaDestinoObj ? Math.max(0, 6 - turmaDestinoObj.totalTutores) : 0;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Remanejar Tutor de Turma"
      tamanho="md"
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            icone={<ArrowRightLeft size={16} aria-hidden="true" />}
            carregando={salvando}
            disabled={salvando || carregandoTurmas || turmas.length === 0 || vagasDestino <= 0}
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
          Selecione a turma de destino para o tutor <strong>{tutor.nome}</strong>. Seus alunos
          vinculados permanecerão sob a responsabilidade dele.
        </p>

        {carregandoTurmas ? (
          <Spinner rotulo="Carregando turmas disponíveis..." />
        ) : turmas.length === 0 ? (
          <Alerta tom="alerta">
            Não há outras turmas ativas disponíveis para transferência no momento.
          </Alerta>
        ) : (
          <>
            <Select
              rotulo="Turma de Destino"
              value={idTurmaDestino}
              onChange={(e) => setIdTurmaDestino(e.target.value)}
            >
              {turmas.map((t) => (
                <option
                  key={t.id}
                  value={String(t.id)}
                  disabled={t.totalTutores >= 6}
                >
                  {t.nome} ({t.vestibularFoco} · {t.anoLetivo}) — {t.totalTutores}/6 tutores
                  {t.totalTutores >= 6 ? ' (Lotada)' : ''}
                </option>
              ))}
            </Select>

            {turmaDestinoObj && (
              <div className={styles.infoCapacidade}>
                <span>Vagas de tutores na turma escolhida:</span>
                <strong>{vagasDestino} de 6 vagas</strong>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
