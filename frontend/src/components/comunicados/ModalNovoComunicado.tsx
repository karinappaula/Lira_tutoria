'use client';

import { useState } from 'react';
import { Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select, Textarea } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { mensagemDeErro } from '@/lib/erros';
import { comunicadosService } from '@/services/comunicados';
import styles from './ModalNovoComunicado.module.scss';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoSucesso: () => void;
  papel: 'ADMINISTRADOR' | 'TUTOR';
  turmas?: Array<{ id: number; nome: string }>;
}

export function ModalNovoComunicado({ aberto, aoFechar, aoSucesso, papel, turmas = [] }: Props) {
  const toast = useToast();
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [idTurma, setIdTurma] = useState('TODOS');
  const [enviando, setEnviando] = useState(false);

  function resetar() {
    setTitulo('');
    setMensagem('');
    setIdTurma('TODOS');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tituloLimpo = titulo.trim();
    const mensagemLimpa = mensagem.trim();

    if (!tituloLimpo) {
      toast.erro('Informe o título do comunicado.');
      return;
    }
    if (!mensagemLimpa) {
      toast.erro('Informe o conteúdo da mensagem.');
      return;
    }

    setEnviando(true);
    try {
      await comunicadosService.enviar({
        tituloComunicado: tituloLimpo,
        mensagem: mensagemLimpa,
        idTurma: papel === 'ADMINISTRADOR' && idTurma !== 'TODOS' ? Number(idTurma) : undefined,
      });
      toast.sucesso('Comunicado enviado com sucesso!');
      resetar();
      aoSucesso();
      aoFechar();
    } catch (err) {
      toast.erro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo Comunicado"
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variante="primario"
            icone={<Send size={15} aria-hidden="true" />}
            carregando={enviando}
            onClick={(e) => void handleSubmit(e)}
          >
            Disparar Comunicado
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
        {papel === 'ADMINISTRADOR' ? (
          <Select
            rotulo="Destinatários do Comunicado"
            value={idTurma}
            onChange={(e) => setIdTurma(e.target.value)}
          >
            <option value="TODOS">Todos os Tutores (Geral)</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                Tutores da turma: {t.nome}
              </option>
            ))}
          </Select>
        ) : (
          <div className={styles.avisoDestinatarios}>
            <Users size={18} aria-hidden="true" />
            <span>Este comunicado será entregue a todos os seus alunos tutorados ativos.</span>
          </div>
        )}

        <Input
          rotulo="Título do Comunicado"
          placeholder="Ex: Orientações para a entrega da Redação #3"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={200}
          required
        />

        <Textarea
          rotulo="Mensagem"
          placeholder="Escreva aqui a mensagem completa do comunicado..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={6}
          required
        />
      </form>
    </Modal>
  );
}
