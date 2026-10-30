import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';
import { erroBackendIndisponivel, erroJson } from '@/lib/respostas';
import type { ApiErroCorpo } from '@/types/api';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;
  const codigoLimpo = (codigo ?? '').trim().toUpperCase();

  if (!codigoLimpo) {
    return erroJson(400, 'Informe um código de convite.', 'CODIGO_OBRIGATORIO');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${getBackendUrl()}/auth/convite/${encodeURIComponent(codigoLimpo)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
  } catch {
    return erroBackendIndisponivel();
  }

  if (!resposta.ok) {
    const erro = (await resposta.json().catch(() => null)) as Partial<ApiErroCorpo> | null;
    return NextResponse.json(
      {
        erro: erro?.erro ?? 'Convite inválido ou não encontrado.',
        codigo: erro?.codigo ?? 'CONVITE_INVALIDO',
      },
      { status: resposta.status }
    );
  }

  const dados = await resposta.json();
  return NextResponse.json(dados, { status: 200 });
}
