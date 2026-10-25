import type { PapelUsuario } from '@/types/api';

export const ROTULO_PAPEL: Record<PapelUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  TUTOR: 'Tutor',
  ALUNO: 'Aluno',
};

/** Página inicial de cada papel (primeira aba do menu no protótipo). */
export const HOME_DO_PAPEL: Record<PapelUsuario, string> = {
  ADMINISTRADOR: '/admin/turmas',
  TUTOR: '/tutor/alunos',
  ALUNO: '/aluno/redacoes',
};

/** Prefixo de rota exclusivo de cada papel. */
export const PREFIXO_DO_PAPEL: Record<PapelUsuario, string> = {
  ADMINISTRADOR: '/admin',
  TUTOR: '/tutor',
  ALUNO: '/aluno',
};

export const NOMES_DE_COOKIE = {
  token: 'lira_token',
  papel: 'lira_papel',
  pendente: 'lira_pendente',
  pendentePapeis: 'lira_pendente_papeis',
} as const;

export function ehPapel(valor: unknown): valor is PapelUsuario {
  return valor === 'ADMINISTRADOR' || valor === 'TUTOR' || valor === 'ALUNO';
}
