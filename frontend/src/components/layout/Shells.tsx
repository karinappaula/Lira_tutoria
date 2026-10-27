'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { BarChart3, FileText, GraduationCap, Notebook } from 'lucide-react';
import { useBuscar } from '@/hooks/useBuscar';
import { EVENTO_FILA_MUDOU, tutorService } from '@/services/tutor';
import { AppShell, type ItemDeMenu } from './AppShell';



const MENU_ADMIN: ItemDeMenu[] = [
  { href: '/admin/turmas', rotulo: 'Turmas' },
  { href: '/admin/correcoes', rotulo: 'Correções pendentes' },
  { href: '/admin/historico', rotulo: 'Histórico geral' },
  { href: '/admin/desempenho', rotulo: 'Desempenho por Turma' },
  { href: '/admin/questoes', rotulo: 'Banco de Questões' },
];

const MENU_ALUNO: ItemDeMenu[] = [
  { href: '/aluno/redacoes', rotulo: 'Minhas Redações', icone: FileText },
  { href: '/aluno/simulados', rotulo: 'Simulados', icone: GraduationCap },
  { href: '/aluno/caderno-erros', rotulo: 'Caderno de Erros', icone: Notebook },
  { href: '/aluno/estatisticas', rotulo: 'Estatísticas', icone: BarChart3 },
];

export const ShellAdmin = ({ children }: { children: ReactNode }) => (
  <AppShell variante="admin" menu={MENU_ADMIN}>
    {children}
  </AppShell>
);

export const ShellAluno = ({ children }: { children: ReactNode }) => (
  <AppShell variante="padrao" menu={MENU_ALUNO}>
    {children}
  </AppShell>
);

export function ShellTutor({ children }: { children: ReactNode }) {
  const fila = useBuscar((signal) => tutorService.fila(signal));
  const { recarregar } = fila;
  useEffect(() => {
    window.addEventListener(EVENTO_FILA_MUDOU, recarregar);
    return () => window.removeEventListener(EVENTO_FILA_MUDOU, recarregar);
  }, [recarregar]);

  const menu = useMemo<ItemDeMenu[]>(
    () => [
      { href: '/tutor/alunos', rotulo: 'Meus alunos' },
      { href: '/tutor/tarefas', rotulo: 'Tarefas' },
      { href: '/tutor/fila', rotulo: 'Fila de correção', contador: fila.dados?.length },
      { href: '/tutor/historico', rotulo: 'Histórico' },
      { href: '/tutor/desempenho', rotulo: 'Desempenho em Redações' },
    ],
    [fila.dados],
  );

  return (
    <AppShell variante="padrao" menu={menu}>
      {children}
    </AppShell>
  );
}