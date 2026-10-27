'use client';

import { useState } from 'react';
import { PencilLine } from 'lucide-react';
import { VersoesDaRedacao } from '@/components/redacao/VersoesDaRedacao';
import { Button } from '@/components/ui/Button/Button';
import { useToast } from '@/components/ui/Toast/Toast';
import { mensagemDeErro } from '@/lib/erros';
import { redacoesService } from '@/services/redacoes';
import type { RedacaoDetalhada, VersaoComCorrecoes } from '@/types/correcoes';
import type { StatusVersao } from '@/types/redacoes';

const MENSAGEM: Partial<Record<StatusVersao, string>> = {
  ENVIADA: 'Seu texto foi enviado e está na fila de correção do seu tutor.',
  EM_CORRECAO: 'Sua redação está em revisão final. O resultado aparece aqui assim que for liberado.',
  AJUSTE_SOLICITADO: 'Sua redação está em revisão final. O resultado aparece aqui assim que for liberado.',
  AGUARDANDO_REESCRITA: 'Seu tutor pediu uma reescrita. Leia a correção abaixo e, quando estiver pronto, comece a reescrever.',
};

/** Redação já enviada: histórico das versões, correção e botão para começar a reescrita. */
export function LeituraRedacao({ redacao, aoAtualizar }: { redacao: RedacaoDetalhada; aoAtualizar: () => void }) {
  const toast = useToast();
  const [criando, setCriando] = useState(false);
  const ultima = redacao.versoes[redacao.versoes.length - 1];

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
      mensagem={(v: VersaoComCorrecoes) => MENSAGEM[v.statusVersao] ?? null}
      acoes={(v) =>
        v.id === ultima?.id && v.statusVersao === 'AGUARDANDO_REESCRITA' ? (
          <Button icone={<PencilLine size={18} aria-hidden="true" />} carregando={criando} onClick={() => void comecarReescrita()}>
            Começar reescrita
          </Button>
        ) : null
      }
    />
  );
}