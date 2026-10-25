import type { ApiErroCorpo } from '@/types/api';

/** Erro normalizado: sempre tem mensagem em português, código estável e (se houver) erros por campo. */
export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalhes: Array<{ campo: string; mensagem: string }>;

  constructor(status: number, corpo: Partial<ApiErroCorpo>) {
    super(corpo.erro ?? 'Ocorreu um erro inesperado. Tente novamente.');
    this.name = 'ApiError';
    this.status = status;
    this.codigo = corpo.codigo ?? 'ERRO_DESCONHECIDO';
    this.detalhes = corpo.detalhes ?? [];
  }

  /** Erro de conexão (backend fora do ar, sem internet...). */
  get ehErroDeConexao(): boolean {
    return this.status === 0 || this.status === 502 || this.status === 504;
  }

  /** Mensagem de um campo específico do formulário, se o backend informou. */
  mensagemDoCampo(campo: string): string | undefined {
    return this.detalhes.find((d) => d.campo === campo)?.mensagem;
  }
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
