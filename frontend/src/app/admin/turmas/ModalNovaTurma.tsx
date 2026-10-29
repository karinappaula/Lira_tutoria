'use client';

import { useState, type FormEvent } from 'react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { mensagemDeErro } from '@/lib/erros';
import { adminService } from '@/services/admin';
import styles from './TurmasAdmin.module.scss';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoSucesso: () => void;
}

export function ModalNovaTurma({ aberto, aoFechar, aoSucesso }: Props) {
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [vestibularFoco, setVestibularFoco] = useState('ENEM');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome da turma.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await adminService.criarTurma({ nome: nome.trim(), anoLetivo, vestibularFoco });
      toast.sucesso('Turma criada com sucesso!');
      aoSucesso();
      aoFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Nova Turma"
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button carregando={salvando} onClick={salvar}>
            Criar turma
          </Button>
        </>
      }
    >
      <form onSubmit={salvar} className={styles.formulario}>
        {erro && <Alerta tom="erro">{erro}</Alerta>}

        <Input
          rotulo="Nome da Turma"
          placeholder="Ex: 3º Ano A - Manhã"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />

        <Input
          rotulo="Ano Letivo"
          type="number"
          min={2000}
          value={String(anoLetivo)}
          onChange={(e) => setAnoLetivo(Number(e.target.value))}
          required
        />

        <Select
          rotulo="Vestibular de Referência"
          value={vestibularFoco}
          onChange={(e) => setVestibularFoco(e.target.value)}
        >
          <option value="ENEM">ENEM</option>
          <option value="FUVEST">FUVEST</option>
          <option value="UNICAMP">UNICAMP</option>
          <option value="UNESP">UNESP</option>
          <option value="UERJ">UERJ</option>
        </Select>
      </form>
    </Modal>
  );
}
