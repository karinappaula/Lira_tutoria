'use client';

import type { ReactNode } from 'react';
import { BarChart3, FileText, GraduationCap, Notebook } from 'lucide-react';
import { AppShell, type ItemDeMenu } from './AppShell';

/*
 * Menus de cada papel, na ordem do protótipo. Ficam em componente de cliente
 * porque carregam ícones. Os contadores "(n)" de Fila de correção e Correções
 * pendentes entram quando as telas correspondentes forem construídas.
 */

const MENU_ADMIN: ItemDeMenu[] = [
  { href: '/admin/turmas', rotulo: 'Turmas' },
  { href: '/admin/correcoes', rotulo: 'Correções pendentes' },
  { href: '/admin/historico', rotulo: 'Histórico geral' },
  { href: '/admin/desempenho', rotulo: 'Desempenho por Turma' },
  { href: '/admin/questoes', rotulo: 'Banco de Questões' },
];

const MENU_TUTOR: ItemDeMenu[] = [
  { href: '/tutor/alunos', rotulo: 'Meus alunos' },
  { href: '/tutor/tarefas', rotulo: 'Tarefas' },
  { href: '/tutor/fila', rotulo: 'Fila de correção' },
  { href: '/tutor/historico', rotulo: 'Histórico' },
  { href: '/tutor/desempenho', rotulo: 'Desempenho em Redações' },
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
export const ShellTutor = ({ children }: { children: ReactNode }) => (
  <AppShell variante="padrao" menu={MENU_TUTOR}>
    {children}
  </AppShell>
);
export const ShellAluno = ({ children }: { children: ReactNode }) => (
  <AppShell variante="padrao" menu={MENU_ALUNO}>
    {children}
  </AppShell>
);
