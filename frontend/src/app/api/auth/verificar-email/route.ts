import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';
import { erroBackendIndisponivel, erroJson, origemConfiavel } from '@/lib/respostas';
import type { ApiErroCorpo } from '@/types/api';

export async function POST(req: Request) {
  if (!origemConfiavel(req)) return erroJson(403, 'Origem não permitida.', 'ORIGEM_INVALIDA');

  const corpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const { email } = corpo ?? {};
  if (typeof email !== 'string' || !email.trim()) {
    return erroJson(400, 'Informe um e-mail válido.', 'CORPO_INVALIDO');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${getBackendUrl()}/auth/verificar-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      cache: 'no-store',
    });
  } catch {
    return erroBackendIndisponivel();
  }

  if (!resposta.ok) {
    const erro = (await resposta.json().catch(() => null)) as Partial<ApiErroCorpo> | null;
    return NextResponse.json(
      {
        erro: erro?.erro ?? 'Não foi possível verificar o e-mail.',
        codigo: erro?.codigo ?? 'ERRO_VERIFICACAO',
      },
      { status: resposta.status },
    );
  }

  const dados = await resposta.json();
  return NextResponse.json(dados, { status: 200 });
}
