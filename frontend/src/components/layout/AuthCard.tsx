import Link from 'next/link';
import type { ComponentProps, FormHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/components/ui/Button/Button';
import { cx } from '@/lib/cx';
import styles from './AuthCard.module.scss';

/** Cartão verde-acinzentado das telas de entrada (login, cadastro, recuperação de senha). */
export function AuthCard({
  idTitulo,
  titulo,
  subtitulo,
  children,
}: {
  idTitulo: string;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.cartao} aria-labelledby={idTitulo}>
      <header className={styles.cabecalho}>
        <h1 id={idTitulo} className={styles.titulo}>
          {titulo}
        </h1>
        {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
      </header>
      {children}
    </section>
  );
}

export function AuthAviso({ children }: { children: ReactNode }) {
  return <div className={styles.aviso}>{children}</div>;
}

export function AuthFormulario(props: FormHTMLAttributes<HTMLFormElement>) {
  return <form noValidate {...props} className={styles.formulario} />;
}

export function AuthBotao({ className, ...resto }: ComponentProps<typeof Button>) {
  return <Button tamanho="lg" pilula larguraTotal className={cx(styles.botao, className)} {...resto} />;
}

export function AuthRodape({ children }: { children: ReactNode }) {
  return <footer className={styles.apoio}>{children}</footer>;
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link}>
      {children}
    </Link>
  );
}

export function AuthSeparador() {
  return <span className={styles.separador} aria-hidden="true" />;
}