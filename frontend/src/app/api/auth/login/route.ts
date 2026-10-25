import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';
import { gravarPendente, gravarSessao } from '@/lib/cookies';
import { ehPapel } from '@/lib/papeis';
import { erroBackendIndisponivel, erroJson, origemConfiavel } from '@/lib/respostas';
import type { ApiErroCorpo, LoginBackend, LoginResultado } from '@/types/api';

export async function POST(req: Request) {
  if (!origemConfiavel(req)) return erroJson(403, 'Origem não permitida.', 'ORIGEM_INVALIDA');

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return erroJson(400, 'Requisição inválida.', 'CORPO_INVALIDO');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${getBackendUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      cache: 'no-store',
    });
  } catch {
    return erroBackendIndisponivel();
  }

  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const erro = dados as Partial<ApiErroCorpo> | null;
    return NextResponse.json(
      {
        erro: erro?.erro ?? 'Não foi possível entrar. Tente novamente.',
        codigo: erro?.codigo ?? 'ERRO_LOGIN',
        ...(erro?.detalhes ? { detalhes: erro.detalhes } : {}),
      },
      { status: resposta.status },
    );
  }

  const login = dados as LoginBackend;

  if (login.tipo === 'sessao' && ehPapel(login.papelAtivo)) {
    const res = NextResponse.json<LoginResultado>({ tipo: 'sessao', papelAtivo: login.papelAtivo });
    gravarSessao(res, login.token, login.papelAtivo);
    return res;
  }

  if (login.tipo === 'selecao_pendente' && Array.isArray(login.papeisDisponiveis)) {
    const papeis = login.papeisDisponiveis.filter(ehPapel);
    const res = NextResponse.json<LoginResultado>({ tipo: 'selecao_pendente', papeisDisponiveis: papeis });
    gravarPendente(res, login.token, papeis);
    return res;
  }

  return erroJson(502, 'Resposta inesperada do servidor.', 'RESPOSTA_INVALIDA');
}
