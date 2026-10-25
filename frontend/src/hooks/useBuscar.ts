'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/erros';

interface Estado<T> {
  dados: T | null;
  carregando: boolean;
  erro: ApiError | null;
}

/**
 * Busca dados da API ao abrir a tela e controla carregando / erro / recarregar.
 * `chave` faz buscar de novo quando muda (ex.: o id da página).
 */
export function useBuscar<T>(buscar: (signal: AbortSignal) => Promise<T>, chave: string | number = '') {
  const [estado, setEstado] = useState<Estado<T>>({ dados: null, carregando: true, erro: null });
  const [tentativa, setTentativa] = useState(0);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  useEffect(() => {
    const controle = new AbortController();
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }));
    buscarRef
      .current(controle.signal)
      .then((dados) => setEstado({ dados, carregando: false, erro: null }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setEstado({ dados: null, carregando: false, erro: e instanceof ApiError ? e : new ApiError(0, {}) });
      });
    return () => controle.abort();
  }, [chave, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);
  return { ...estado, recarregar };
}