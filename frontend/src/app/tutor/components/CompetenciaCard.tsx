'use client';

import { useId } from 'react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { cx } from '@/lib/cx';
import { LIMITE_TEXTO, NIVEIS, type Competencia, type Nivel } from '@/lib/rubrica';
import styles from './CompetenciaCard.module.scss';

interface Props {
  competencia: Competencia;
  nivel: Nivel | null;
  aoEscolherNivel: (nivel: Nivel) => void;
  comentario: string;
  aoMudarComentario: (texto: string) => void;
  erroNivel?: string;
  erroComentario?: string;
  /** Quantas marcações do texto servem de evidência para esta competência */
  evidencias: number;
}

/** Uma competência: escolha de nível pela rubrica + justificativa obrigatória. */
export function CompetenciaCard({ competencia, nivel, aoEscolherNivel, comentario, aoMudarComentario, erroNivel, erroComentario, evidencias }: Props) {
  const id = useId();
  const niveisDecrescentes = [...NIVEIS].reverse();
  const alertaDeCoerencia =
    nivel === 200 && evidencias >= 3
      ? `Atenção: há ${evidencias} marcações ligadas a esta competência, mas a nota é 200. Confira se o nível está coerente.`
      : nivel === 0
        ? 'Nota zero: explique na justificativa o motivo (por exemplo, fuga total ao tema ou desrespeito aos direitos humanos).'
        : null;

  return (
    <fieldset className={styles.cartao} aria-describedby={`${id}-ajuda`}>
      <legend className={styles.legenda}>
        <span className={styles.numero}>C{competencia.numero}</span> {competencia.nome}
      </legend>
      <p id={`${id}-ajuda`} className={styles.pergunta}>
        {competencia.pergunta}
      </p>

      <div className={styles.niveis} role="radiogroup" aria-label={`Nível da competência ${competencia.numero}`}>
        {niveisDecrescentes.map((n) => (
          <label key={n} className={cx(styles.nivel, nivel === n && styles.nivelAtivo)}>
            <input type="radio" name={`${id}-nivel`} value={n} checked={nivel === n} onChange={() => aoEscolherNivel(n)} />
            <span className={styles.nota}>{n}</span>
            <span className={styles.descricao}>{competencia.niveis[n]}</span>
          </label>
        ))}
      </div>
      {erroNivel && (
        <p className={styles.erro} role="alert">
          {erroNivel}
        </p>
      )}

      <div className={styles.evidencias}>
        <Badge tom={evidencias > 0 ? 'sucesso' : 'neutro'}>
          {evidencias === 0 ? 'Nenhuma marcação ligada' : `${evidencias} ${evidencias === 1 ? 'marcação ligada' : 'marcações ligadas'}`}
        </Badge>
      </div>
      {alertaDeCoerencia && <Alerta tom="info">{alertaDeCoerencia}</Alerta>}

      <label htmlFor={`${id}-comentario`} className={styles.rotuloComentario}>
        Justificativa da nota (obrigatória)
      </label>
      <textarea
        id={`${id}-comentario`}
        className={cx(styles.comentario, erroComentario && styles.invalido)}
        value={comentario}
        onChange={(e) => aoMudarComentario(e.target.value)}
        maxLength={LIMITE_TEXTO}
        rows={3}
        placeholder="Explique, com base no texto do aluno, por que este nível foi escolhido."
        aria-invalid={erroComentario ? true : undefined}
      />
      <div className={styles.rodape}>
        {erroComentario ? (
          <p className={styles.erro} role="alert">
            {erroComentario}
          </p>
        ) : (
          <span />
        )}
        <span className={styles.contador}>
          {comentario.length}/{LIMITE_TEXTO}
        </span>
      </div>
    </fieldset>
  );
}