'use client';

import { useMemo, useState } from 'react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Card } from '@/components/ui/Card/Card';
import { cx } from '@/lib/cx';
import { competenciasDe, notaFinal, statusDaCorrecaoRotulo, type MarcaVisual } from '@/lib/correcoes';
import { formatarData } from '@/lib/formatar';
import { COMPETENCIAS, descricaoDoNivel, infoDoTipo, TIPOS_DE_ERRO } from '@/lib/rubrica';
import type { CorrecaoDaVersao } from '@/types/correcoes';
import { TextoMarcado } from './TextoMarcado';
import marcado from './TextoMarcado.module.scss';
import styles from './ResultadoDaCorrecao.module.scss';

interface Props {
  texto: string;
  correcao: CorrecaoDaVersao;
  /** Tutor e Administração também veem o recado e a observação da Administração */
  visaoInterna?: boolean;
  /** Força uma coluna só (usado dentro de janelas) */
  coluna?: boolean;
}

/** Nota final, competências com o significado de cada nível, comentários e o texto marcado. */
export function ResultadoDaCorrecao({ texto, correcao, visaoInterna = false, coluna = false }: Props) {
  const [ativa, setAtiva] = useState<number | null>(null);
  const competencias = competenciasDe(correcao);
  const final = notaFinal(correcao);
  const status = statusDaCorrecaoRotulo(correcao.statusAprovacao);

  const marcas = useMemo<MarcaVisual[]>(
    () => correcao.anotacoes.map((a) => ({ chave: a.id, inicio: a.posicaoInicio, fim: a.posicaoFinal, tipoErro: a.tipoErro })),
    [correcao.anotacoes],
  );
  const anotacaoAtiva = correcao.anotacoes.find((a) => a.id === ativa);
  const tiposPresentes = TIPOS_DE_ERRO.filter((t) => correcao.anotacoes.some((a) => infoDoTipo(a.tipoErro).estilo === t.estilo));

  return (
    <div className={styles.resultado}>
      <header className={styles.nota}>
        <div>
          <p className={styles.notaRotulo}>Nota final</p>
          <p className={styles.notaValor}>
            {final}
            <span>/1000</span>
          </p>
        </div>
        <div className={styles.notaMeta}>
          {visaoInterna && <Badge tom={status.tom}>{status.rotulo}</Badge>}
          <p>
            Corrigida por {correcao.tutor?.usuario.nome ?? 'seu tutor'} em {formatarData(correcao.dataCorrecao)}
            {correcao.numeroAjuste > 0 ? ` · ajuste ${correcao.numeroAjuste}` : ''}
          </p>
        </div>
      </header>

      {visaoInterna && correcao.comentarioAjusteAdmin && (
        <Alerta tom="info">
          <strong>Observação da Administração:</strong> {correcao.comentarioAjusteAdmin}
        </Alerta>
      )}
      {visaoInterna && correcao.recadoAdmin && (
        <Alerta tom="info">
          <strong>Recado do Tutor para a Administração:</strong> {correcao.recadoAdmin}
        </Alerta>
      )}

      <div className={cx(styles.grade, coluna && styles.coluna)}>
        <Card titulo="Seu texto, com as marcações" className={styles.cartaoTexto}>
          {tiposPresentes.length > 0 && (
            <ul className={styles.legenda} aria-label="Tipos de marcação">
              {tiposPresentes.map((t) => (
                <li key={t.valor}>
                  <span className={cx(marcado.marca, marcado[t.estilo], styles.amostra)}>Aa</span>
                  {t.valor}
                </li>
              ))}
            </ul>
          )}
          <TextoMarcado
            texto={texto}
            marcas={marcas}
            marcaAtiva={ativa}
            aoClicarMarca={(m) => setAtiva((atual) => (atual === m.chave ? null : Number(m.chave)))}
            rotulo="Texto da redação com marcações da correção"
          />
          {anotacaoAtiva ? (
            <div className={styles.detalheMarca} role="status">
              <p className={styles.detalheTipo}>
                {infoDoTipo(anotacaoAtiva.tipoErro).valor}
                {infoDoTipo(anotacaoAtiva.tipoErro).competencia && <span> · Competência {infoDoTipo(anotacaoAtiva.tipoErro).competencia}</span>}
              </p>
              <p className={styles.detalheTrecho}>“{anotacaoAtiva.textoSelecionado}”</p>
              <p>{anotacaoAtiva.sugestaoComentario || 'Sem sugestão escrita para este trecho.'}</p>
            </div>
          ) : (
            correcao.anotacoes.length > 0 && <p className={styles.dica}>Toque ou clique em um trecho marcado para ver a explicação.</p>
          )}
        </Card>

        <div className={styles.competencias}>
          {competencias.map((c) => {
            const info = COMPETENCIAS.find((x) => x.numero === c.numero);
            return (
              <Card key={c.numero} className={styles.competencia}>
                <div className={styles.competenciaTopo}>
                  <h3>
                    C{c.numero} · {info?.nome}
                  </h3>
                  <strong>{c.nota}/200</strong>
                </div>
                <div className={styles.barra} role="img" aria-label={`Nota ${c.nota} de 200`}>
                  <span style={{ width: `${(c.nota / 200) * 100}%` }} />
                </div>
                <p className={styles.nivel}>{descricaoDoNivel(c.numero, c.nota)}</p>
                <p className={styles.comentario}>{c.comentario || 'Sem comentário.'}</p>
              </Card>
            );
          })}
          {correcao.parecerGeral && (
            <Card titulo="Parecer geral">
              <p className={styles.comentario}>{correcao.parecerGeral}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}