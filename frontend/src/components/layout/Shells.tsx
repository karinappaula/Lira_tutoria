'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BarChart3,
  Bell,
  FileText,
  GraduationCap,
  Notebook,
} from 'lucide-react';
import { useBuscar } from '@/hooks/useBuscar';
import { comunicadosService, EVENTO_COMUNICADOS_MUDOU } from '@/services/comunicados';
import { EVENTO_FILA_MUDOU, tutorService } from '@/services/tutor';
import { AppShell, type ItemDeMenu } from './AppShell';

const MENU_ADMIN: ItemDeMenu[] = [
  { href: '/admin/turmas', rotulo: 'Turmas' },
  { href: '/admin/tarefas', rotulo: 'Tarefas gerais' },
  { href: '/admin/temas', rotulo: 'Banco de temas' },
  { href: '/admin/correcoes', rotulo: 'Correções pendentes' },
  { href: '/admin/historico', rotulo: 'Histórico geral' },
  { href: '/admin/desempenho', rotulo: 'Desempenho por Turma' },
  { href: '/admin/questoes', rotulo: 'Banco de Questões' },
  { href: '/admin/comunicados', rotulo: 'Comunicados' },
];

export const ShellAdmin = ({ children }: { children: ReactNode }) => (
  <AppShell variante="admin" menu={MENU_ADMIN}>
    {children}
  </AppShell>
);

export function ShellAluno({ children }: { children: ReactNode }) {
  const [naoLidos, setNaoLidos] = useState(0);

  useEffect(() => {
    let ativo = true;
    function carregar() {
      comunicadosService
        .contarNaoLidos()
        .then((res) => {
          if (ativo) setNaoLidos(res.naoLidos);
        })
        .catch(() => {});
    }

    carregar();
    window.addEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
    };
  }, []);

  const menu = useMemo<ItemDeMenu[]>(
    () => [
      { href: '/aluno/redacoes', rotulo: 'Minhas Redações', icone: FileText },
      { href: '/aluno/simulados', rotulo: 'Simulados', icone: GraduationCap },
      { href: '/aluno/caderno-erros', rotulo: 'Caderno de Erros', icone: Notebook },
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
  const fila = useBuscar((signal) => tutorService.fila(signal));
  const { recarregar } = fila;
  const [naoLidos, setNaoLidos] = useState(0);

  useEffect(() => {
    window.addEventListener(EVENTO_FILA_MUDOU, recarregar);
    return () => window.removeEventListener(EVENTO_FILA_MUDOU, recarregar);
  }, [recarregar]);

  useEffect(() => {
    let ativo = true;
    function carregar() {
      comunicadosService
        .contarNaoLidos()
        .then((res) => {
          if (ativo) setNaoLidos(res.naoLidos);
        })
        .catch(() => {});
    }

    carregar();
    window.addEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
    };
  }, []);

  const menu = useMemo<ItemDeMenu[]>(
    () => [
      { href: '/tutor/alunos', rotulo: 'Meus alunos' },
      { href: '/tutor/tarefas', rotulo: 'Tarefas' },
      { href: '/tutor/temas', rotulo: 'Banco de temas' },
      { href: '/tutor/fila', rotulo: 'Fila de correção', contador: fila.dados?.length },
      { href: '/tutor/historico', rotulo: 'Histórico' },
      { href: '/tutor/desempenho', rotulo: 'Desempenho em Redações' },
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
