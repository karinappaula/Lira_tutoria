'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/erros';
import { authService } from '@/services/auth';
import type { Sessao } from '@/types/api';

type Estado =
  | { situacao: 'carregando' }
  | { situacao: 'ok'; sessao: Sessao }
  | { situacao: 'erro'; erro: ApiError };

interface Contexto {
  estado: Estado;
  recarregar: () => void;
}

const SessaoContexto = createContext<Contexto | null>(null);

/** Busca quem está logado (GET /auth/me) e disponibiliza para o cabeçalho e as telas. */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ situacao: 'carregando' });

  const carregar = useCallback(() => {
    setEstado({ situacao: 'carregando' });
    authService
      .sessao()
      .then((sessao) => setEstado({ situacao: 'ok', sessao }))
      .catch((e: unknown) => {
        const erro = e instanceof ApiError ? e : new ApiError(0, {});
        // Sessão inválida: o cookie já foi limpo pelo servidor; volta para o login.
        if (erro.status === 401) {
          window.location.assign('/login?sessao=expirada');
          return;
        }
        setEstado({ situacao: 'erro', erro });
      });
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return <SessaoContexto.Provider value={{ estado, recarregar: carregar }}>{children}</SessaoContexto.Provider>;
}

export function useSessao(): Contexto {
  const ctx = useContext(SessaoContexto);
  if (!ctx) throw new Error('useSessao precisa estar dentro de <SessaoProvider>.');
  return ctx;
}
