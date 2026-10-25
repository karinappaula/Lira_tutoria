import 'server-only';
import type { NextResponse } from 'next/server';
import { NOMES_DE_COOKIE } from '@/lib/papeis';
import type { PapelUsuario } from '@/types/api';

const SETE_DIAS = 60 * 60 * 24 * 7;
const DEZ_MINUTOS = 60 * 10;

function opcoes(maxAge: number) {
  return {
    httpOnly: true, // JavaScript do navegador não consegue ler: protege contra roubo por XSS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const, // protege contra CSRF
    path: '/',
    maxAge,
  };
}

export function gravarSessao(res: NextResponse, token: string, papel: PapelUsuario): void {
  res.cookies.set(NOMES_DE_COOKIE.token, token, opcoes(SETE_DIAS));
  res.cookies.set(NOMES_DE_COOKIE.papel, papel, opcoes(SETE_DIAS));
  limparPendente(res);
}

export function gravarPendente(res: NextResponse, tokenPendente: string, papeis: PapelUsuario[]): void {
  res.cookies.set(NOMES_DE_COOKIE.pendente, tokenPendente, opcoes(DEZ_MINUTOS));
  res.cookies.set(NOMES_DE_COOKIE.pendentePapeis, JSON.stringify(papeis), opcoes(DEZ_MINUTOS));
}

export function limparPendente(res: NextResponse): void {
  res.cookies.delete(NOMES_DE_COOKIE.pendente);
  res.cookies.delete(NOMES_DE_COOKIE.pendentePapeis);
}

export function limparSessao(res: NextResponse): void {
  res.cookies.delete(NOMES_DE_COOKIE.token);
  res.cookies.delete(NOMES_DE_COOKIE.papel);
  limparPendente(res);
}
