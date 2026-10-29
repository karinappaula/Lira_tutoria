'use client';

import { useState } from 'react';
import { Copy, UserPlus } from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/formatar';
import { adminService, type TurmaAdmin } from '@/services/admin';
import type { ConviteCriado } from '@/types/correcoes';
import styles from './TurmasAdmin.module.scss';

interface Props {
  turma: TurmaAdmin | null;
  aberto: boolean;
  aoFechar: () => void;
  aoSucesso?: () => void;
}

const MAX_TUTORES = 6;

export function ModalConviteTutor({ turma, aberto, aoFechar, aoSucesso }: Props) {
  const toast = useToast();
  const [usosMaximos, setUsosMaximos] = useState(1);
  const [convite, setConvite] = useState<ConviteCriado | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!turma) return null;

  const tutoresAtuais = turma.totalTutores;
  const vagasRestantes = Math.max(0, MAX_TUTORES - tutoresAtuais);

  async function gerar() {
    setGerando(true);
    setErro(null);
    try {
      const res = await adminService.gerarConviteTutor(turma!.id, usosMaximos);
      setConvite(res);
      toast.sucesso('Convite de tutor gerado com sucesso!');
      aoSucesso?.();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setGerando(false);
    }
  }

  const link =
    convite && typeof window !== 'undefined'
      ? `${window.location.origin}/cadastro?codigo=${encodeURIComponent(convite.codigo)}`
      : '';

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.sucesso('Link copiado!');
    } catch {
      toast.erro('Não foi possível copiar o link.');
    }
  }

  function fechar() {
    setConvite(null);
    setErro(null);
    setUsosMaximos(1);
    aoFechar();
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={fechar}
      titulo={`Convidar Tutores - ${turma.nome}`}
      rodape={
        convite ? (
          <Button onClick={fechar}>Concluir</Button>
        ) : (
          <>
            <Button variante="secundario" onClick={fechar} disabled={gerando}>
              Cancelar
            </Button>
            <Button
              icone={<UserPlus size={16} aria-hidden="true" />}
              carregando={gerando}
              disabled={vagasRestantes <= 0}
              onClick={() => void gerar()}
            >
              Gerar convite
            </Button>
          </>
        )
      }
    >
      <div className={styles.formulario}>
        {erro && <Alerta tom="erro">{erro}</Alerta>}

        <div className={styles.infoCapacidade}>
          <span>
            Tutores na turma: <strong>{tutoresAtuais} de {MAX_TUTORES}</strong>
          </span>
          <Badge tom={vagasRestantes > 0 ? 'sucesso' : 'perigo'}>
            {vagasRestantes > 0 ? `${vagasRestantes} vagas disponíveis` : 'Turma sem vagas de tutor'}
          </Badge>
        </div>

        {convite ? (
          <>
            <div className={styles.codigo}>
              <strong>{convite.codigo}</strong>
              <span>
                Válido para até {convite.usosMaximos} {convite.usosMaximos === 1 ? 'tutor' : 'tutores'} até {formatarDataHora(convite.expiraEm)}
              </span>
            </div>

            <p>Envie o link abaixo para os tutores convidados. O link expira após atingir o limite ou o prazo.</p>
            <p className={styles.linkConvite}>{link}</p>

            <Button
              variante="primario"
              icone={<Copy size={16} aria-hidden="true" />}
              onClick={() => void copiar(link)}
            >
              Copiar link de convite
            </Button>
          </>
        ) : vagasRestantes <= 0 ? (
          <Alerta tom="alerta">
            Esta turma já atingiu o limite de {MAX_TUTORES} tutores. Não é possível gerar novos convites para ela.
          </Alerta>
        ) : (
          <>
            <p>
              Defina a quantidade de utilizações que este código de convite terá (máximo de vagas na turma: {vagasRestantes}).
            </p>

            <Input
              rotulo="Quantidade de Tutores (usos máximos de 1 a 6)"
              type="number"
              min={1}
              max={vagasRestantes}
              value={String(usosMaximos)}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= vagasRestantes) {
                  setUsosMaximos(val);
                } else if (e.target.value === '') {
                  setUsosMaximos(1);
                }
              }}
              dica={`Permite que até ${usosMaximos} ${usosMaximos === 1 ? 'tutor entre' : 'tutores entrem'} na turma usando o mesmo link.`}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
