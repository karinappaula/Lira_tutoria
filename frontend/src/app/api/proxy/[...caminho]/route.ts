import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';
import { limparSessao } from '@/lib/cookies';
import { NOMES_DE_COOKIE } from '@/lib/papeis';
import { erroBackendIndisponivel, erroJson, origemConfiavel } from '@/lib/respostas';

/**
 * Proxy para a API do backend. O navegador chama /api/proxy/<rota>; aqui o
 * servidor do Next acrescenta o token (que está num cookie httpOnly) e repassa.
 * Assim o navegador nunca vê o token nem o endereço do backend.
 */

// Rotas /auth que NÃO podem passar pelo proxy: devolvem token no corpo da resposta
// e por isso têm manipuladores próprios (login, seleção de papel, cadastro).
const ROTAS_AUTH_PERMITIDAS = new Set([
  'auth/me',
  'auth/esqueci-senha',
  'auth/redefinir-senha',
  'auth/participar-como-aluno',
]);

const METODOS_COM_CORPO = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

type Contexto = { params: Promise<{ caminho: string[] }> };

async function repassar(req: Request, { params }: Contexto): Promise<Response> {
  const { caminho } = await params;

  // Bloqueia tentativas de sair da API (../) ou caracteres estranhos no caminho.
  if (caminho.some((parte) => parte === '' || parte === '.' || parte === '..' || !/^[\w.~:@+-]+$/.test(parte))) {
    return erroJson(400, 'Caminho inválido.', 'CAMINHO_INVALIDO');
  }

  const rota = caminho.join('/');
  if (rota.startsWith('auth/') && !ROTAS_AUTH_PERMITIDAS.has(rota)) {
    return erroJson(404, 'Rota não encontrada.', 'ROTA_NAO_ENCONTRADA');
  }

  if (req.method !== 'GET' && !origemConfiavel(req)) {
    return erroJson(403, 'Origem não permitida.', 'ORIGEM_INVALIDA');
  }

  const token = (await cookies()).get(NOMES_DE_COOKIE.token)?.value;
  const rotaPublica = rota === 'auth/esqueci-senha' || rota === 'auth/redefinir-senha';
  if (!token && !rotaPublica) {
    const res = erroJson(401, 'Sua sessão expirou. Entre novamente.', 'SEM_SESSAO');
    limparSessao(res);
    return res;
  }

  const url = new URL(req.url);
  const destino = `${getBackendUrl()}/${rota}${url.search}`;

  const cabecalhos = new Headers();
  const tipo = req.headers.get('content-type');
  if (tipo) cabecalhos.set('Content-Type', tipo);
  if (token) cabecalhos.set('Authorization', `Bearer ${token}`);

  let resposta: Response;
  try {
    resposta = await fetch(destino, {
      method: req.method,
      headers: cabecalhos,
      body: METODOS_COM_CORPO.has(req.method) ? await req.text() : undefined,
      cache: 'no-store',
    });
  } catch {
    return erroBackendIndisponivel();
  }

   // Respostas 204/205/304 (ex.: exclusões) não podem ter corpo
  const semCorpo = [204, 205, 304].includes(resposta.status);
  const res = semCorpo
    ? new NextResponse(null, { status: resposta.status })
    : new NextResponse(await resposta.text(), {
        status: resposta.status,
        headers: { 'Content-Type': resposta.headers.get('content-type') ?? 'application/json' },
      });
  if (resposta.status === 401) limparSessao(res);
  return res;
}

export const GET = repassar;
export const POST = repassar;
export const PATCH = repassar;
export const PUT = repassar;
export const DELETE = repassar;
