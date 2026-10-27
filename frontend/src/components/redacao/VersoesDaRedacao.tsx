'use client';

import { useState, type ReactNode } from 'react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Card } from '@/components/ui/Card/Card';
import { cx } from '@/lib/cx';
import { ultimaCorrecao } from '@/lib/correcoes';
import { formatarDataHora } from '@/lib/formatar';
import { statusParaAluno, statusParaGestao } from '@/lib/redacoes';
import type { RedacaoDetalhada, VersaoComCorrecoes } from '@/types/correcoes';
import { ResultadoDaCorrecao } from './ResultadoDaCorrecao';
import styles from './VersoesDaRedacao.module.scss';

interface Props {
  redacao: RedacaoDetalhada;
  /** true para Tutor/Administração: mostra status internos, recado e observação da Administração */
  visaoInterna?: boolean;
  /** Aviso opcional abaixo do título da versão */
  mensagem?: (versao: VersaoComCorrecoes) => string | null;
  /** Botões da versão (ex.: "Começar reescrita") */
  acoes?: (versao: VersaoComCorrecoes) => ReactNode;
}

/** Histórico da redação: abas "Versão 1" / "Reescrita", cada uma com texto e correção. */
export function VersoesDaRedacao({ redacao, visaoInterna = false, mensagem, acoes }: Props) {
  const [indice, setIndice] = useState(redacao.versoes.length - 1);
  const versao = redacao.versoes[Math.min(indice, redacao.versoes.length - 1)];
  if (!versao) return null;

  const status = visaoInterna ? statusParaGestao(versao) : statusParaAluno(versao);
  const correcao = ultimaCorrecao(versao);
  const aviso = mensagem?.(versao);
  const botoes = acoes?.(versao);

  return (
    <div className={styles.versoes}>
      {redacao.versoes.length > 1 && (
        <div className={styles.abas} role="tablist" aria-label="Versões da redação">
          {redacao.versoes.map((v, i) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              id={`aba-versao-${v.id}`}
              aria-selected={i === indice}
              aria-controls={`painel-versao-${v.id}`}
              className={cx(styles.aba, i === indice && styles.abaAtiva)}
              onClick={() => setIndice(i)}
            >
              {v.numeroVersao === 1 ? 'Versão 1' : 'Reescrita (versão 2)'}
            </button>
          ))}
        </div>
      )}

      <section id={`painel-versao-${versao.id}`} role="tabpanel" aria-labelledby={`aba-versao-${versao.id}`} className={styles.painel}>
        <header className={styles.cabecalho}>
          <h2 className={styles.titulo}>{versao.numeroVersao === 1 ? 'Versão 1' : 'Reescrita (versão 2)'}</h2>
          <Badge tom={status.tom}>{status.rotulo}</Badge>
          {versao.dataEnvio && <span className={styles.data}>Enviada em {formatarDataHora(versao.dataEnvio)}</span>}
        </header>

        {aviso && <Alerta tom="info">{aviso}</Alerta>}
        {botoes && <div className={styles.acoes}>{botoes}</div>}

        {correcao ? (
          <ResultadoDaCorrecao texto={versao.conteudoTexto} correcao={correcao} visaoInterna={visaoInterna} />
        ) : (
          <Card titulo="Texto enviado">
            <p className={styles.texto}>{versao.conteudoTexto || 'Texto vazio.'}</p>
          </Card>
        )}
      </section>
    </div>
  );
}