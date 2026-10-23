import { fetchClient } from '@/lib/api';
import { LoginResposta, SessaoResposta, Usuario, PapelUsuario } from '@/types/api';

export async function loginApi(email: string, senha: string): Promise<LoginResposta> {
  return fetchClient<LoginResposta>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
}

export async function selecionarPapelApi(
  tokenPendente: string,
  papel: PapelUsuario
): Promise<SessaoResposta> {
  return fetchClient<SessaoResposta>('/auth/selecionar-papel', {
    method: 'POST',
    body: JSON.stringify({ tokenPendente, papel }),
  });
}

export async function cadastrarApi(dados: {
  codigo: string;
  nome: string;
  email: string;
  senha: string;
}): Promise<SessaoResposta> {
  return fetchClient<SessaoResposta>('/auth/cadastro', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

export async function meApi(): Promise<{
  usuario: Usuario;
  papelAtivo: PapelUsuario;
  papeisDisponiveis: PapelUsuario[];
}> {
  return fetchClient<{
    usuario: Usuario;
    papelAtivo: PapelUsuario;
    papeisDisponiveis: PapelUsuario[];
  }>('/auth/me');
}

export async function esqueciSenhaApi(email: string): Promise<{ mensagem: string }> {
  return fetchClient<{ mensagem: string }>('/auth/esqueci-senha', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function redefinirSenhaApi(
  token: string,
  novaSenha: string
): Promise<{ mensagem: string }> {
  return fetchClient<{ mensagem: string }>('/auth/redefinir-senha', {
    method: 'POST',
    body: JSON.stringify({ token, novaSenha }),
  });
}