'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Input, Select } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { mensagemDeErro } from '@/lib/erros';
import { simuladosService } from '@/services/simulados';
import type { Assunto, CriarSimuladoPayload, SimuladoExecucao } from '@/types/simulados';
import styles from './ModalConfigurarSimulado.module.scss';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  assuntosDisponiveis: Assunto[];
  aoSimuladoCriado: (simulado: SimuladoExecucao) => void;
}

export function ModalConfigurarSimulado({
  aberto,
  aoFechar,
  assuntosDisponiveis,
  aoSimuladoCriado,
}: Props) {
  const toast = useToast();
  const [quantidade, setQuantidade] = useState<number>(10);
  const [vestibular, setVestibular] = useState<string>('TODOS');
  const [ano, setAno] = useState<string>('');
  const [grauDificuldade, setGrauDificuldade] = useState<string>('TODAS');
  const [idAssunto, setIdAssunto] = useState<string>('TODOS');

  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleGerar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const qtd = Number(quantidade);
    if (!qtd || isNaN(qtd) || qtd < 1 || qtd > 50) {
      setErro('Informe uma quantidade de questões entre 1 e 50.');
      return;
    }

    const payload: CriarSimuladoPayload = {
      quantidade: qtd,
      vestibular: vestibular !== 'TODOS' ? vestibular : undefined,
      ano: ano ? Number(ano) : undefined,
      grauDificuldade: grauDificuldade !== 'TODAS' ? grauDificuldade : undefined,
      idAssunto: idAssunto !== 'TODOS' ? Number(idAssunto) : undefined,
    };

    setGerando(true);
    try {
      const simulado = await simuladosService.criar(payload);
      // Se criou com status CRIADO, inicia imediatamente
      let pronto = simulado;
      if (pronto.statusSimulado === 'CRIADO') {
        pronto = await simuladosService.iniciar(pronto.id);
      }
      toast.sucesso(
        simulado.aviso
          ? simulado.aviso
          : `Simulado criado com ${pronto.questoes.length} questões! Cronômetro iniciado.`,
      );
      aoSimuladoCriado(pronto);
      aoFechar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setGerando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Gerar Novo Simulado Personalizado"
      tamanho="md"
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar} disabled={gerando}>
            Cancelar
          </Button>
          <Button
            variante="primario"
            carregando={gerando}
            icone={<Play size={16} aria-hidden="true" />}
            onClick={(e) => void handleGerar(e)}
          >
            Gerar e Iniciar
          </Button>
        </>
      }
    >
      <form onSubmit={handleGerar} className={styles.form}>
        {erro && <Alerta tom="erro">{erro}</Alerta>}

        <p className={styles.avisoFiltros}>
          Personalize as questões do seu simulado. O algoritmo do LIRA selecionará as melhores questões do banco de
          acordo com os critérios escolhidos.
        </p>

        <Input
          rotulo="Quantidade de Questões (1 a 50) *"
          type="number"
          min={1}
          max={50}
          value={quantidade}
          onChange={(e) => setQuantidade(Number(e.target.value))}
          disabled={gerando}
        />

        <div className={styles.linhaCampos}>
          <Select
            rotulo="Vestibular"
            value={vestibular}
            onChange={(e) => setVestibular(e.target.value)}
            disabled={gerando}
          >
            <option value="TODOS">Todos os Vestibulares</option>
            <option value="ENEM">ENEM</option>
            <option value="FUVEST">FUVEST</option>
            <option value="UNICAMP">UNICAMP</option>
          </Select>

          <Input
            rotulo="Ano da Prova (Opcional)"
            type="number"
            min={1990}
            max={2030}
            placeholder="Ex.: 2024"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            disabled={gerando}
          />
        </div>

        <div className={styles.linhaCampos}>
          <Select
            rotulo="Grau de Dificuldade"
            value={grauDificuldade}
            onChange={(e) => setGrauDificuldade(e.target.value)}
            disabled={gerando}
          >
            <option value="TODAS">Misto (Qualquer Dificuldade)</option>
            <option value="FACIL">Fácil</option>
            <option value="MEDIA">Média</option>
            <option value="DIFICIL">Difícil</option>
          </Select>

          <Select
            rotulo="Tópico / Assunto Específico"
            value={idAssunto}
            onChange={(e) => setIdAssunto(e.target.value)}
            disabled={gerando}
          >
            <option value="TODOS">Todos os Assuntos</option>
            {assuntosDisponiveis.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nomeAssunto} ({a._count?.questoes ?? 0})
              </option>
            ))}
          </Select>
        </div>
      </form>
    </Modal>
  );
}
