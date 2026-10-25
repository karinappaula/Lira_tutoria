import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';
import { erroBackendIndisponivel, erroJson, origemConfiavel } from '@/lib/respostas';
import type { ApiErroCorpo } from '@/types/api';

/**
 * Cadastro por código de convite. Tem rota própria (e não passa pelo proxy) porque
 * só repassamos os 4 campos esperados e NUNCA devolvemos a resposta do backend ao
 * navegador (ela pode conter token). Depois do cadastro, o usuário entra pelo login.
 */
export async function POST(req: Request) {
  if (!origemConfiavel(req)) return erroJson(403, 'Origem não permitida.', 'ORIGEM_INVALIDA');

  const corpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const { codigo, nome, email, senha } = corpo ?? {};
  if (![codigo, nome, email, senha].every((v) => typeof v === 'string')) {
    return erroJson(400, 'Preencha todos os campos para criar a conta.', 'CORPO_INVALIDO');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${getBackendUrl()}/auth/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: (codigo as string).trim().toUpperCase(), nome, email, senha }),
      cache: 'no-store',
    });
  } catch {
    return erroBackendIndisponivel();
  }

  if (!resposta.ok) {
    const erro = (await resposta.json().catch(() => null)) as Partial<ApiErroCorpo> | null;
    return NextResponse.json(
      {
        erro: erro?.erro ?? 'Não foi possível criar a conta. Tente novamente.',
        codigo: erro?.codigo ?? 'ERRO_CADASTRO',
        ...(erro?.detalhes ? { detalhes: erro.detalhes } : {}),
      },
      { status: resposta.status },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}