'use client';

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import { cx } from '@/lib/cx';
import styles from './Campos.module.scss';

type Variante = 'padrao' | 'auth';

interface BaseProps {
  rotulo: string;
  erro?: string;
  dica?: string;
  variante?: Variante;
  /** Esconde o rótulo visualmente (continua lido por leitores de tela) */
  ocultarRotulo?: boolean;
}

interface CampoProps extends BaseProps {
  id: string;
  children: ReactNode;
}

function Campo({ id, rotulo, erro, dica, variante = 'padrao', ocultarRotulo, children }: CampoProps) {
  return (
    <div className={cx(styles.campo, styles[variante])}>
      <label htmlFor={id} className={cx(styles.rotulo, ocultarRotulo && styles.oculto)}>
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className={styles.erro} role="alert">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className={styles.dica}>
          {dica}
        </p>
      ) : null}
    </div>
  );
}

function descricao(id: string, erro?: string, dica?: string) {
  return erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
}

/* ---------------- Input ---------------- */
interface InputProps extends BaseProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { rotulo, erro, dica, variante = 'padrao', ocultarRotulo, type = 'text', className, ...resto },
  ref,
) {
  const id = useId();
  const [visivel, setVisivel] = useState(false);
  const ehSenha = type === 'password';

  return (
    <Campo id={id} rotulo={rotulo} erro={erro} dica={dica} variante={variante} ocultarRotulo={ocultarRotulo}>
      <div className={styles.envolucro}>
        <input
          ref={ref}
          id={id}
          type={ehSenha && visivel ? 'text' : type}
          className={cx(styles.controle, ehSenha && styles.comAcao, erro && styles.invalido, className)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao(id, erro, dica)}
          {...resto}
        />
        {ehSenha && (
          <button
            type="button"
            className={styles.acao}
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visivel}
          >
            {visivel ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        )}
      </div>
    </Campo>
  );
});

/* ---------------- Select ---------------- */
interface SelectProps extends BaseProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { rotulo, erro, dica, variante = 'padrao', ocultarRotulo, className, children, ...resto },
  ref,
) {
  const id = useId();
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} dica={dica} variante={variante} ocultarRotulo={ocultarRotulo}>
      <div className={styles.envolucro}>
        <select
          ref={ref}
          id={id}
          className={cx(styles.controle, styles.select, erro && styles.invalido, className)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao(id, erro, dica)}
          {...resto}
        >
          {children}
        </select>
        <ChevronDown size={18} className={styles.seta} aria-hidden="true" />
      </div>
    </Campo>
  );
});

/* ---------------- Textarea ---------------- */
interface TextareaProps extends BaseProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { rotulo, erro, dica, variante = 'padrao', ocultarRotulo, className, ...resto },
  ref,
) {
  const id = useId();
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} dica={dica} variante={variante} ocultarRotulo={ocultarRotulo}>
      <textarea
        ref={ref}
        id={id}
        className={cx(styles.controle, styles.area, erro && styles.invalido, className)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao(id, erro, dica)}
        {...resto}
      />
    </Campo>
  );
});
