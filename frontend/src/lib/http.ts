import { ApiError } from '@/lib/erros';
import type { ApiErroCorpo } from '@/types/api';

/**
 * Cliente HTTP do navegador. Todas as chamadas vão para /api/proxy/..., que
 * acrescenta o token no servidor. Nada de token ou endereço de backend aqui.
 */

type Metodo = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type Consulta = Record<string, string | number | boolean | null | undefined>;

interface Opcoes {
  consulta?: Consulta;
  corpo?: unknown;
  signal?: AbortSignal;
}

function montarUrl(rota: string, consulta?: Consulta): string {
  const limpa = rota.replace(/^\/+/, '');
  const params = new URLSearchParams();
  if (consulta) {
    for (const [chave, valor] of Object.entries(consulta)) {
      if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
    }
  }
  const qs = params.toString();
  return `/api/proxy/${limpa}${qs ? `?${qs}` : ''}`;
}

function sairDaSessao(): void {
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login?sessao=expirada');
  }
}

/** Faz uma chamada JSON e devolve os dados, ou lança ApiError já normalizado. */
export async function requisitar<T>(metodo: Metodo, rota: string, opcoes: Opcoes = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(rota, opcoes.consulta), {
      method: metodo,
      headers: opcoes.corpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
      signal: opcoes.signal,
      credentials: 'same-origin',
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, {
      erro: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
      codigo: 'SEM_CONEXAO',
    });
  }

  const texto = await resposta.text();
  let dados: unknown = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = null;
    }
  }

  if (!resposta.ok) {
    if (resposta.status === 401) sairDaSessao();
    throw new ApiError(resposta.status, (dados as Partial<ApiErroCorpo> | null) ?? {});
  }

  return dados as T;
}

export const api = {
  get: <T>(rota: string, consulta?: Consulta, signal?: AbortSignal) =>
    requisitar<T>('GET', rota, { consulta, signal }),
  post: <T>(rota: string, corpo?: unknown) => requisitar<T>('POST', rota, { corpo: corpo ?? {} }),
  patch: <T>(rota: string, corpo: unknown) => requisitar<T>('PATCH', rota, { corpo }),
  delete: <T>(rota: string) => requisitar<T>('DELETE', rota),
};
