import { ErroAPI } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export async function fetchClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('@lira:token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('@lira:token');
      localStorage.removeItem('@lira:user');
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorPayload: ErroAPI = {
      erro: data.erro || 'Ocorreu um erro inesperado na requisição.',
      codigo: data.codigo || 'ERRO_DESCONHECIDO',
      detalhes: data.detalhes || [],
    };
    throw errorPayload;
  }

  return data as T;
}
