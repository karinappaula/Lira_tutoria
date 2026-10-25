import 'server-only';
import { NextResponse } from 'next/server';
import type { ApiErroCorpo } from '@/types/api';

export function erroJson(status: number, erro: string, codigo: string): NextResponse<ApiErroCorpo> {
  return NextResponse.json({ erro, codigo }, { status });
}

export const erroBackendIndisponivel = () =>
  erroJson(
    502,
    'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente em instantes.',
    'BACKEND_INDISPONIVEL',
  );

/** Confere se a requisição veio da própria página (defesa extra contra CSRF). */
export function origemConfiavel(req: Request): boolean {
  const origem = req.headers.get('origin');
  if (!origem) return true; // navegadores só omitem Origin em GET/navegação
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origem).host === host;
  } catch {
    return false;
  }
}
