import { fetchClient } from '@/lib/api';
import { Redacao } from '@/types/api';

export async function listarMinhasRedacoesApi(): Promise<Redacao[]> {
  return fetchClient<Redacao[]>('/redacoes');
}

export async function buscarRedacaoPorIdApi(idRedacao: number): Promise<Redacao> {
  return fetchClient<Redacao>(`/redacoes/${idRedacao}`);
}

export async function criarRedacaoTreinoApi(dados: {
  idTema?: number;
  temaProprio?: string;
  conteudoTexto?: string;
}): Promise<Redacao> {
  return fetchClient<Redacao>('/redacoes', {
    method: 'POST',
    body: JSON.stringify({
      tipoFluxo: 'TREINO',
      ...dados,
    }),
  });
}

export async function criarRedacaoAvaliativaApi(dados: {
  idTarefa: number;
  idTema?: number;
  conteudoTexto?: string;
}): Promise<Redacao> {
  return fetchClient<Redacao>('/redacoes', {
    method: 'POST',
    body: JSON.stringify({
      tipoFluxo: 'AVALIATIVA',
      ...dados,
    }),
  });
}

export async function autosaveRascunhoApi(
  idRedacao: number,
  conteudoTexto: string
): Promise<{ mensagem: string }> {
  return fetchClient<{ mensagem: string }>(`/redacoes/${idRedacao}/rascunho`, {
    method: 'PATCH',
    body: JSON.stringify({ conteudoTexto }),
  });
}

export async function enviarRedacaoApi(idRedacao: number): Promise<{ mensagem: string }> {
  return fetchClient<{ mensagem: string }>(`/redacoes/${idRedacao}/enviar`, {
    method: 'POST',
  });
}

export async function criarReescritaApi(idRedacao: number): Promise<{ mensagem: string }> {
  return fetchClient<{ mensagem: string }>(`/redacoes/${idRedacao}/reescrita`, {
    method: 'POST',
  });
}

export async function excluirRascunhoApi(idRedacao: number): Promise<{ mensagem: string }> {
  return fetchClient<{ mensagem: string }>(`/redacoes/${idRedacao}`, {
    method: 'DELETE',
  });
}