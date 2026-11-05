'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  FileText,
  GraduationCap,
  Notebook,
} from 'lucide-react';
import { useBuscar } from '@/hooks/useBuscar';
import { adminService, EVENTO_CORRECOES_ADMIN_MUDOU } from '@/services/admin';
import { comunicadosService, EVENTO_COMUNICADOS_MUDOU } from '@/services/comunicados';
import { EVENTO_FILA_MUDOU, tutorService } from '@/services/tutor';
import { AppShell, type ItemDeMenu } from './AppShell';

export function ShellAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fila = useBuscar((signal) => adminService.correcoesPendentes(signal));
  const { recarregar } = fila;

  useEffect(() => {
    window.addEventListener(EVENTO_CORRECOES_ADMIN_MUDOU, recarregar);
    return () => window.removeEventListener(EVENTO_CORRECOES_ADMIN_MUDOU, recarregar);
  }, [recarregar]);

  useEffect(() => {
    recarregar();
  }, [pathname, recarregar]);

  useEffect(() => {
    window.addEventListener('focus', recarregar);
    return () => window.removeEventListener('focus', recarregar);
  }, [recarregar]);

  const pendentes = fila.dados?.length ?? 0;

  const menu = useMemo<ItemDeMenu[]>(
    () => [
      { href: '/admin/turmas', rotulo: 'Turmas' },
      { href: '/admin/tarefas', rotulo: 'Tarefas gerais' },
      { href: '/admin/temas', rotulo: 'Banco de temas' },
      {
        href: '/admin/correcoes',
        rotulo: 'Correções pendentes',
        contador: pendentes > 0 ? pendentes : undefined,
      },
      { href: '/admin/historico', rotulo: 'Histórico geral' },
      { href: '/admin/desempenho', rotulo: 'Desempenho por turma' },
      { href: '/admin/questoes', rotulo: 'Banco de questões' },
      { href: '/admin/comunicados', rotulo: 'Comunicados' },
    ],
    [pendentes],
  );

  return (
    <AppShell variante="admin" menu={menu}>
      {children}
    </AppShell>
  );
}

export function ShellAluno({ children }: { children: ReactNode }) {
  const [naoLidos, setNaoLidos] = useState(0);

  useEffect(() => {
    let ativo = true;
    function carregar() {
      if (document.visibilityState !== 'visible') return;
      comunicadosService
        .contarNaoLidos()
        .then((res) => {
          if (ativo) setNaoLidos(res.naoLidos);
        })
        .catch(() => {});
    }

    carregar();
    window.addEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
    window.addEventListener('focus', carregar);
    const intervalo = window.setInterval(carregar, 30_000);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
      window.removeEventListener('focus', carregar);
      window.clearInterval(intervalo);
    };
  }, []);

  const menu = useMemo<ItemDeMenu[]>(
    () => [
      { href: '/aluno/redacoes', rotulo: 'Minhas redações', icone: FileText },
      { href: '/aluno/simulados', rotulo: 'Simulados', icone: GraduationCap },
      { href: '/aluno/caderno-erros', rotulo: 'Caderno de erros', icone: Notebook },
      { href: '/aluno/estatisticas', rotulo: 'Estatísticas', icone: BarChart3 },
      {
        href: '/aluno/comunicados',
        rotulo: 'Comunicados',
        icone: Bell,
        contador: naoLidos > 0 ? naoLidos : undefined,
      },
    ],
    [naoLidos],
  );

  return (
    <AppShell variante="padrao" menu={menu}>
      {children}
    </AppShell>
  );
}

export function ShellTutor({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fila = useBuscar((signal) => tutorService.fila(signal));
  const { recarregar } = fila;
  const [naoLidos, setNaoLidos] = useState(0);

  useEffect(() => {
    window.addEventListener(EVENTO_FILA_MUDOU, recarregar);
    return () => window.removeEventListener(EVENTO_FILA_MUDOU, recarregar);
  }, [recarregar]);

  useEffect(() => {
    recarregar();
  }, [pathname, recarregar]);

  useEffect(() => {
    window.addEventListener('focus', recarregar);
    return () => window.removeEventListener('focus', recarregar);
  }, [recarregar]);

  useEffect(() => {
    let ativo = true;
    function carregar() {
      if (document.visibilityState !== 'visible') return;
      comunicadosService
        .contarNaoLidos()
        .then((res) => {
          if (ativo) setNaoLidos(res.naoLidos);
        })
        .catch(() => {});
    }

    carregar();
    window.addEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
    window.addEventListener('focus', carregar);
    const intervalo = window.setInterval(carregar, 30_000);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
      window.removeEventListener('focus', carregar);
      window.clearInterval(intervalo);
    };
  }, []);

  const menu = useMemo<ItemDeMenu[]>(
    () => [
      { href: '/tutor/alunos', rotulo: 'Meus alunos' },
      { href: '/tutor/tarefas', rotulo: 'Tarefas' },
      { href: '/tutor/temas', rotulo: 'Banco de temas' },
      { href: '/tutor/fila', rotulo: 'Fila de correção', contador: fila.dados?.length },
      { href: '/tutor/historico', rotulo: 'Histórico' },
      { href: '/tutor/desempenho', rotulo: 'Desempenho em redações' },
      {
        href: '/tutor/comunicados',
        rotulo: 'Comunicados',
        icone: Bell,
        contador: naoLidos > 0 ? naoLidos : undefined,
      },
    ],
    [fila.dados, naoLidos],
  );

  return (
    <AppShell variante="padrao" menu={menu}>
      {children}
    </AppShell>
  );
}
