import { NextResponse } from 'next/server';
import { limparSessao } from '@/lib/cookies';
import { erroJson, origemConfiavel } from '@/lib/respostas';

export async function POST(req: Request) {
  if (!origemConfiavel(req)) return erroJson(403, 'Origem não permitida.', 'ORIGEM_INVALIDA');
  const res = NextResponse.json({ ok: true });
  limparSessao(res);
  return res;
}
