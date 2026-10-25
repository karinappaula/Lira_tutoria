import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';
import { gravarSessao, limparPendente } from '@/lib/cookies';
import { NOMES_DE_COOKIE, ehPapel } from '@/lib/papeis';
import { erroBackendIndisponivel, erroJson, origemConfiavel } from '@/lib/respostas';
import type { ApiErroCorpo, LoginBackend, LoginResultado } from '@/types/api';

export async function POST(req: Request) {
  if (!origemConfiavel(req)) return erroJson(403, 'Origem não permitida.', 'ORIGEM_INVALIDA');

  const corpo = (await req.json().catch(() => null)) as { papel?: unknown } | null;
  if (!corpo || !ehPapel(corpo.papel)) {
    return erroJson(400, 'Escolha uma área válida para continuar.', 'PAPEL_INVALIDO');
  }

  const tokenPendente = (await cookies()).get(NOMES_DE_COOKIE.pendente)?.value;
  if (!tokenPendente) {
    return erroJson(401, 'Sua tentativa de entrada expirou. Entre novamente.', 'SELECAO_EXPIRADA');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${getBackendUrl()}/auth/selecionar-papel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenPendente, papel: corpo.papel }),
      cache: 'no-store',
    });
  } catch {
    return erroBackendIndisponivel();
  }

  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const erro = dados as Partial<ApiErroCorpo> | null;
    const res = NextResponse.json(
      { erro: erro?.erro ?? 'Não foi possível selecionar a área.', codigo: erro?.codigo ?? 'ERRO_SELECAO' },
      { status: resposta.status },
    );
    if (resposta.status === 401) limparPendente(res);
    return res;
  }

  const sessao = dados as LoginBackend;
  if (sessao.tipo !== 'sessao' || !ehPapel(sessao.papelAtivo)) {
    return erroJson(502, 'Resposta inesperada do servidor.', 'RESPOSTA_INVALIDA');
  }

  const res = NextResponse.json<LoginResultado>({ tipo: 'sessao', papelAtivo: sessao.papelAtivo });
  gravarSessao(res, sessao.token, sessao.papelAtivo);
  return res;
}
