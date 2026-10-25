/**
 * Contratos da API do backend LIRA (fonte: docs/ROTAS.md e schema.prisma).
 * Só entram aqui campos confirmados na documentação. Os tipos de cada módulo
 * (redações, tarefas, simulados...) serão adicionados na fase que usar a rota.
 */

export type PapelUsuario = 'ADMINISTRADOR' | 'TUTOR' | 'ALUNO';

export interface UsuarioBasico {
  id: number;
  nome: string;
  email: string;
}

/** Resposta de GET /auth/me */
export interface Sessao {
  usuario: UsuarioBasico;
  papelAtivo: PapelUsuario;
  papeisDisponiveis: PapelUsuario[];
}

/** Erro padrão do backend: { erro, codigo, detalhes? } */
export interface ApiErroCorpo {
  erro: string;
  codigo: string;
  detalhes?: Array<{ campo: string; mensagem: string }>;
}

/** O que o navegador recebe de /api/auth/login (o token NUNCA vai para o navegador). */
export type LoginResultado =
  | { tipo: 'sessao'; papelAtivo: PapelUsuario }
  | { tipo: 'selecao_pendente'; papeisDisponiveis: PapelUsuario[] };

/** Respostas brutas do backend (usadas só no servidor do Next). */
export type LoginBackend =
  | { tipo: 'sessao'; token: string; papelAtivo: PapelUsuario; usuario: UsuarioBasico }
  | { tipo: 'selecao_pendente'; token: string; papeisDisponiveis: PapelUsuario[]; usuario: UsuarioBasico };
