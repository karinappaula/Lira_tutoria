import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Card } from '@/components/ui/Card/Card';
import { formatarDataHora } from '@/lib/formatar';
import { statusParaAluno } from '@/lib/redacoes';
import type { Redacao, StatusVersao } from '@/types/redacoes';
import styles from './LeituraRedacao.module.scss';

// Textos provisórios das versões já enviadas. A tela da correção (notas, comentários e
// marcações) e o botão "Começar reescrita" chegam na F2b.
const MENSAGEM: Partial<Record<StatusVersao, string>> = {
  ENVIADA: 'Seu texto foi enviado e está na fila de correção do seu tutor.',
  EM_CORRECAO: 'Sua redação está em revisão final. O resultado aparece aqui assim que for liberado.',
  AJUSTE_SOLICITADO: 'Sua redação está em revisão final. O resultado aparece aqui assim que for liberado.',
  CORRIGIDA: 'Esta redação foi corrigida. A tela com notas e comentários será liberada na próxima etapa do sistema.',
  AGUARDANDO_REESCRITA: 'Seu tutor pediu uma reescrita. O botão para começar chega na próxima etapa do sistema.',
};

/** Redação já enviada: mostra cada versão (somente leitura). */
export function LeituraRedacao({ redacao }: { redacao: Redacao }) {
  return (
    <div className={styles.versoes}>
      {redacao.versoes.map((versao) => {
        const status = statusParaAluno(versao);
        const mensagem = MENSAGEM[versao.statusVersao];
        return (
          <Card
            key={versao.id}
            titulo={versao.numeroVersao === 1 ? 'Versão 1' : 'Reescrita (versão 2)'}
            acao={<Badge tom={status.tom}>{status.rotulo}</Badge>}
          >
            {versao.dataEnvio && <p className={styles.data}>Enviada em {formatarDataHora(versao.dataEnvio)}</p>}
            {mensagem && (
              <div className={styles.aviso}>
                <Alerta tom="info">{mensagem}</Alerta>
              </div>
            )}
            <p className={styles.texto}>{versao.conteudoTexto || 'Texto vazio.'}</p>
          </Card>
        );
      })}
    </div>
  );
}