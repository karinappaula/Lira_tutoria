'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Usuario, PapelUsuario, LoginResposta } from '@/types/api';
import { meApi } from '@/services/auth';

interface AuthContextType {
  usuario: Usuario | null;
  papelAtivo: PapelUsuario | null;
  token: string | null;
  carregando: boolean;
  salvarSessao: (token: string, usuario: Usuario, papelAtivo: PapelUsuario) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const ROTAS_PUBLICAS = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/selecionar-papel'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [papelAtivo, setPapelAtivo] = useState<PapelUsuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function carregarSessao() {
      const tokenSalvo = localStorage.getItem('@lira:token');
      if (!tokenSalvo) {
        setCarregando(false);
        if (!ROTAS_PUBLICAS.includes(pathname)) {
          router.push('/login');
        }
        return;
      }

      try {
        setToken(tokenSalvo);
        const dadosMe = await meApi();
        setUsuario(dadosMe.usuario);
        setPapelAtivo(dadosMe.papelAtivo);
      } catch {
        logout();
      } finally {
        setCarregando(false);
      }
    }

    carregarSessao();
  }, [pathname]);

  function salvarSessao(novoToken: string, novoUsuario: Usuario, novoPapel: PapelUsuario) {
    localStorage.setItem('@lira:token', novoToken);
    localStorage.setItem('@lira:user', JSON.stringify(novoUsuario));
    setToken(novoToken);
    setUsuario(novoUsuario);
    setPapelAtivo(novoPapel);

    if (novoPapel === 'ADMINISTRADOR') router.push('/admin/turmas');
    else if (novoPapel === 'TUTOR') router.push('/tutor/alunos');
    else if (novoPapel === 'ALUNO') router.push('/aluno/redacoes');
  }

  function logout() {
    localStorage.removeItem('@lira:token');
    localStorage.removeItem('@lira:user');
    setToken(null);
    setUsuario(null);
    setPapelAtivo(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider
      value={{ usuario, papelAtivo, token, carregando, salvarSessao, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}