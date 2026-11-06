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
  const ultimaChaveRef = useRef(chave);
  const ultimaRevalidacaoRef = useRef(0);
  buscarRef.current = buscar;

  useEffect(() => {
    const mudouChave = ultimaChaveRef.current !== chave;
    ultimaChaveRef.current = chave;

    const controle = new AbortController();
    setEstado((atual) => ({
      ...atual,
      carregando: mudouChave || atual.dados === null,
      erro: null,
    }));
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

  useEffect(() => {
    function revalidarComProtecao() {
      if (document.visibilityState !== 'visible') return;
      const agora = Date.now();
      if (agora - ultimaRevalidacaoRef.current < 1_000) return;
      ultimaRevalidacaoRef.current = agora;
      recarregar();
    }

    function atualizarAoRetornar() {
      if (document.visibilityState === 'visible') revalidarComProtecao();
    }

    window.addEventListener('focus', atualizarAoRetornar);
    document.addEventListener('visibilitychange', atualizarAoRetornar);
    window.addEventListener('online', revalidarComProtecao);

    const intervalo = window.setInterval(revalidarComProtecao, 30_000);

    return () => {
      window.removeEventListener('focus', atualizarAoRetornar);
      document.removeEventListener('visibilitychange', atualizarAoRetornar);
      window.removeEventListener('online', revalidarComProtecao);
      window.clearInterval(intervalo);
    };
  }, [recarregar]);

  return { ...estado, recarregar };
}