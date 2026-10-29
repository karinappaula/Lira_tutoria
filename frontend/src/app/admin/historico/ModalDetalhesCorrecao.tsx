'use client';

import { useEffect, useState } from 'react';
import { ResultadoDaCorrecao } from '@/components/redacao/ResultadoDaCorrecao';
import { Button } from '@/components/ui/Button/Button';
import { ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { mensagemDeErro } from '@/lib/erros';
import { adminService, type CorrecaoPendenteItem } from '@/services/admin';
import type { CorrecaoDaVersao } from '@/types/correcoes';
import styles from './HistoricoAdmin.module.scss';

interface Props {
  idCorrecao: number | null;
  aberto: boolean;
  aoFechar: () => void;
}

export function ModalDetalhesCorrecao({ idCorrecao, aberto, aoFechar }: Props) {
  const [correcao, setCorrecao] = useState<CorrecaoPendenteItem | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    if (!idCorrecao) return;
    setCarregando(true);
    setErro(null);
    adminService
      .obterCorrecao(idCorrecao)
      .then((res) => {
        setCorrecao(res);
      })
      .catch((e) => {
        setErro(mensagemDeErro(e));
      })
      .finally(() => {
        setCarregando(false);
      });
  }

  useEffect(() => {
    if (aberto && idCorrecao) {
      carregar();
    } else {
      setCorrecao(null);
      setErro(null);
    }
  }, [aberto, idCorrecao]);

  if (!idCorrecao) return null;

  const alunoNome = correcao?.versao?.redacao?.aluno?.usuario?.nome ?? 'Redação';
  const temaTitulo =
    correcao?.versao?.redacao?.tema?.tituloTema ??
    correcao?.versao?.redacao?.tarefa?.tituloTarefa ??
    'Redação';

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Detalhes da Correção: ${alunoNome} (${temaTitulo})`}
      tamanho="xl"
      rodape={<Button onClick={aoFechar}>Fechar</Button>}
    >
      <div className={styles.corpoDetalhesModal}>
        {carregando ? (
          <CarregandoPagina rotulo="Carregando correção completa e apontamentos..." />
        ) : erro ? (
          <ErrorState mensagem={erro} aoTentarNovamente={carregar} />
        ) : correcao ? (
          <ResultadoDaCorrecao
            texto={correcao.versao.conteudoTexto}
            correcao={correcao as unknown as CorrecaoDaVersao}
            visaoInterna={true}
          />
        ) : null}
      </div>
    </Modal>
  );
}
