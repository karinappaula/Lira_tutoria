import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';
import { limparSessao } from '@/lib/cookies';
import { NOMES_DE_COOKIE } from '@/lib/papeis';
import { erroBackendIndisponivel, erroJson } from '@/lib/respostas';

/** Devolve GET /auth/me para a interface (nome do usuário, papel ativo e papéis disponíveis). */
export async function GET() {
  const token = (await cookies()).get(NOMES_DE_COOKIE.token)?.value;
  if (!token) return erroJson(401, 'Sessão não encontrada.', 'SEM_SESSAO');

  let resposta: Response;
  try {
    resposta = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return erroBackendIndisponivel();
  }

  const corpo: unknown = await resposta.json().catch(() => null);
  const res = NextResponse.json(corpo, { status: resposta.status });
  if (resposta.status === 401) limparSessao(res);
  return res;
}
