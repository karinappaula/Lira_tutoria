'use client';

import { useState } from 'react';
import { PencilLine } from 'lucide-react';
import { VersoesDaRedacao } from '@/components/redacao/VersoesDaRedacao';
import { Button } from '@/components/ui/Button/Button';
import { useToast } from '@/components/ui/Toast/Toast';
import { mensagemDeErro } from '@/lib/erros';
import { redacoesService } from '@/services/redacoes';
import type { RedacaoDetalhada, VersaoComCorrecoes } from '@/types/correcoes';
import { StatusRedacao, type StatusVersao } from '@/types/redacoes';

const MENSAGEM: Partial<Record<StatusVersao, string>> = {
  ENVIADA: 'Seu texto foi enviado e está na fila de correção do seu tutor.',
  EM_CORRECAO: 'Sua redação está em revisão final. O resultado aparece aqui assim que for liberado.',
  EM_REVISAO_FINAL: 'Sua redação está em revisão final. O resultado aparece aqui assim que for liberado.',
  AJUSTE_SOLICITADO: 'Sua redação está em revisão final. O resultado aparece aqui assim que for liberado.',
  AGUARDANDO_REESCRITA: 'Seu tutor pediu uma reescrita. Leia a correção abaixo e, quando estiver pronto, comece a reescrever.',
  REESCRITA_SOLICITADA: 'Seu tutor pediu uma reescrita. Leia a correção abaixo e, quando estiver pronto, comece a reescrever.',
};

/** Redação já enviada: histórico das versões, correção e botão para começar a reescrita. */
export function LeituraRedacao({ redacao, aoAtualizar }: { redacao: RedacaoDetalhada; aoAtualizar: () => void }) {
  const toast = useToast();
  const [criando, setCriando] = useState(false);
  const ultima = redacao.versoes[redacao.versoes.length - 1];
  const versaoUm = redacao.versoes.find((versao) => versao.numeroVersao === 1);
  const correcaoV1 = versaoUm?.correcoes[versaoUm.correcoes.length - 1];
  const notasCompetenciasV1 = correcaoV1
    ? [
        correcaoV1.notaComp1,
        correcaoV1.notaComp2,
        correcaoV1.notaComp3,
        correcaoV1.notaComp4,
        correcaoV1.notaComp5,
      ]
    : [];
  const notaTotalV1 = correcaoV1?.notaTotal !== null && correcaoV1?.notaTotal !== undefined
    ? Number(correcaoV1.notaTotal)
    : notasCompetenciasV1.length === 5 && notasCompetenciasV1.every((nota) => nota !== null)
      ? notasCompetenciasV1.reduce<number>((total, nota) => total + Number(nota), 0)
      : Number.NaN;
  const podeIniciarReescrita = notaTotalV1 < 700;
  const statusPermiteReescrita =
    ultima?.statusVersao === 'AGUARDANDO_REESCRITA' ||
    ultima?.statusVersao === 'REESCRITA_SOLICITADA';

  async function comecarReescrita() {
    setCriando(true);
    try {
      await redacoesService.reescrever(redacao.id);
      toast.sucesso('Reescrita criada. Pode começar a escrever!');
      aoAtualizar();
    } catch (e) {
      toast.erro(mensagemDeErro(e));
      setCriando(false);
    }
  }

  return (
    <VersoesDaRedacao
      redacao={redacao}
      podeExibirCorrecao={(v) =>
        v.statusVersao === StatusRedacao.CORRIGIDA ||
        v.statusVersao === StatusRedacao.CONCLUIDA ||
        v.statusVersao === 'REESCRITA_SOLICITADA' ||
        v.statusVersao === 'AGUARDANDO_REESCRITA' ||
        (v.numeroVersao === 1 &&
          redacao.versoes.some(
            (item) =>
              item.statusVersao === 'REESCRITA_SOLICITADA' ||
              item.statusVersao === 'AGUARDANDO_REESCRITA' ||
              item.numeroVersao === 2
          ))
      }
      mensagem={(v: VersaoComCorrecoes) =>
        v.id === ultima?.id && statusPermiteReescrita && !podeIniciarReescrita
          ? 'A reescrita só pode ser iniciada quando a nota total da versão 1 for abaixo de 700.'
          : MENSAGEM[v.statusVersao] ?? null
      }
      acoes={(v) =>
        v.id === ultima?.id && statusPermiteReescrita && podeIniciarReescrita ? (
          <Button icone={<PencilLine size={18} aria-hidden="true" />} carregando={criando} onClick={() => void comecarReescrita()}>
            Começar reescrita
          </Button>
        ) : null
      }
    />
  );
}