'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cx } from '@/lib/cx';
import styles from './Toast.module.scss';

type Tipo = 'sucesso' | 'erro' | 'info';
interface Item {
  id: number;
  tipo: Tipo;
  mensagem: string;
}

interface Contexto {
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
  info: (mensagem: string) => void;
}

const ToastContexto = createContext<Contexto | null>(null);
const ICONES = { sucesso: CheckCircle2, erro: AlertCircle, info: Info };
const DURACAO_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const proximoId = useRef(1);

  const remover = useCallback((id: number) => setItens((atual) => atual.filter((i) => i.id !== id)), []);

  const adicionar = useCallback(
    (tipo: Tipo, mensagem: string) => {
      const id = proximoId.current++;
      setItens((atual) => [...atual.slice(-3), { id, tipo, mensagem }]);
      window.setTimeout(() => remover(id), DURACAO_MS);
    },
    [remover],
  );

  const valor = useMemo<Contexto>(
    () => ({
      sucesso: (m) => adicionar('sucesso', m),
      erro: (m) => adicionar('erro', m),
      info: (m) => adicionar('info', m),
    }),
    [adicionar],
  );

  return (
    <ToastContexto.Provider value={valor}>
      {children}
      <div className={styles.area} aria-live="polite" aria-atomic="false">
        {itens.map((item) => {
          const Icone = ICONES[item.tipo];
          return (
            <div key={item.id} className={cx(styles.toast, styles[item.tipo])} role={item.tipo === 'erro' ? 'alert' : 'status'}>
              <Icone size={20} aria-hidden="true" className={styles.icone} />
              <p className={styles.mensagem}>{item.mensagem}</p>
              <button type="button" className={styles.fechar} onClick={() => remover(item.id)} aria-label="Fechar aviso">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContexto.Provider>
  );
}

export function useToast(): Contexto {
  const ctx = useContext(ToastContexto);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return ctx;
}
