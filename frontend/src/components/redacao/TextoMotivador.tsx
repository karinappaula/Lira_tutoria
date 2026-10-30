'use client';

import { ExternalLink } from 'lucide-react';
import { cx } from '@/lib/cx';
import styles from './TextoMotivador.module.scss';

interface Props {
  texto?: string | null;
  imagemUrl?: string | null;
  titulo?: string;
  className?: string;
}

/**
 * Renderiza o texto motivador de uma proposta de redação:
 * - Substitui dinamicamente a tag [IMAGEM] (case-insensitive) pelo componente visual da imagemUrl.
 * - Fallback: Se houver imagemUrl e a tag [IMAGEM] não estiver no texto, exibe a imagem ao final do texto.
 */
export function TextoMotivador({ texto, imagemUrl, titulo, className }: Props) {
  const urlLimpa = imagemUrl?.trim();
  const textoLimpo = texto?.trim();

  if (!textoLimpo && !urlLimpa) {
    return (
      <div className={cx(styles.blocoMotivador, styles.blocoVazio, className)}>
        <p className={styles.vazio}>Nenhum texto motivador cadastrado para este tema.</p>
      </div>
    );
  }

  const componenteImagem = urlLimpa ? (
    <div className={styles.containerImagem}>
      <a
        href={urlLimpa}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.linkImagem}
        title="Abrir imagem da coletânea em nova aba"
      >
        <img
          src={urlLimpa}
          alt={titulo ? `Coletânea visual: ${titulo}` : 'Imagem motivadora'}
          className={styles.imagem}
        />
        <span className={styles.legenda}>
          <ExternalLink size={13} aria-hidden="true" />
          <span>Ampliar imagem</span>
        </span>
      </a>
    </div>
  ) : null;

  // Se não há texto, mas há imagem
  if (!textoLimpo && componenteImagem) {
    return <div className={cx(styles.blocoMotivador, className)}>{componenteImagem}</div>;
  }

  const regexTag = /\[IMAGEM\]/i;
  const temTag = Boolean(urlLimpa && regexTag.test(textoLimpo!));

  if (temTag && componenteImagem) {
    const partes = textoLimpo!.split(regexTag);
    return (
      <div className={cx(styles.blocoMotivador, className)}>
        {partes.map((parte, i) => (
          <div key={i} className={styles.secaoParte}>
            {parte.trim() && <p className={styles.paragrafo}>{parte.trim()}</p>}
            {i < partes.length - 1 && componenteImagem}
          </div>
        ))}
      </div>
    );
  }

  // Fallback: Se houver imagemUrl mas a tag [IMAGEM] não foi digitada,
  // ou se não houver imagemUrl (remove a tag [IMAGEM] órfã do texto).
  const textoFormatado = textoLimpo!.replace(/\[IMAGEM\]/gi, '').trim();

  return (
    <div className={cx(styles.blocoMotivador, className)}>
      {textoFormatado && <p className={styles.paragrafo}>{textoFormatado}</p>}
      {componenteImagem}
    </div>
  );
}
