import { ApiError } from '@/lib/erros';
import { api } from '@/lib/http';
import type { ApiErroCorpo, LoginResultado, PapelUsuario, Sessao } from '@/types/api';

/** Chamadas aos manipuladores de autenticação do próprio Next.js (/api/auth/...). */
async function chamar<T>(url: string, init?: RequestInit): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(url, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError(0, {
      erro: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
      codigo: 'SEM_CONEXAO',
    });
  }
  const dados: unknown = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ApiError(resposta.status, (dados as Partial<ApiErroCorpo> | null) ?? {});
  return dados as T;
}

const json = (corpo: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
});

export interface DadosDeCadastro {
  codigo: string;
  nome: string;
  email: string;
  senha: string;
}

export const authService = {
  login: (email: string, senha: string) => chamar<LoginResultado>('/api/auth/login', json({ email, senha })),
  selecionarPapel: (papel: PapelUsuario) => chamar<LoginResultado>('/api/auth/selecionar-papel', json({ papel })),
  logout: () => chamar<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  sessao: () => chamar<Sessao>('/api/auth/sessao'),

  /** Cadastro por convite. Não entra automaticamente: o usuário vai para o login. */
  cadastrar: (dados: DadosDeCadastro) => chamar<{ ok: true }>('/api/auth/cadastro', json(dados)),

  /** O backend sempre responde de forma genérica (não revela se o e-mail existe). */
  esqueciSenha: (email: string) => api.post<unknown>('auth/esqueci-senha', { email }),

  /** O token vem do link enviado por e-mail. Vale 1 hora e só pode ser usado uma vez. */
  redefinirSenha: (token: string, novaSenha: string) => api.post<unknown>('auth/redefinir-senha', { token, novaSenha }),
};