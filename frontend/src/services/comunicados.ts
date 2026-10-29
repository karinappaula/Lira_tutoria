import { requisitar } from '@/lib/http';
import type {
  ComunicadoDetalhado,
  ComunicadoEnviado,
  ComunicadoRecebido,
  ContagemNaoLidosResponse,
  EnviarComunicadoPayload,
} from '@/types/comunicados';

export const EVENTO_COMUNICADOS_MUDOU = 'lira:comunicados:mudou';

export function dispararComunicadosMudou() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_COMUNICADOS_MUDOU));
  }
}

export const comunicadosService = {
  listarRecebidos(apenasNaoLidos?: boolean, signal?: AbortSignal): Promise<ComunicadoRecebido[]> {
    return requisitar<ComunicadoRecebido[]>('GET', 'comunicados', {
      consulta: apenasNaoLidos ? { naoLidos: 'true' } : undefined,
      signal,
    });
  },

  listarEnviados(signal?: AbortSignal): Promise<ComunicadoEnviado[]> {
    return requisitar<ComunicadoEnviado[]>('GET', 'comunicados/enviados', { signal });
  },

  contarNaoLidos(signal?: AbortSignal): Promise<ContagemNaoLidosResponse> {
    return requisitar<ContagemNaoLidosResponse>('GET', 'comunicados/nao-lidos', { signal });
  },

  obter(idComunicado: number, signal?: AbortSignal): Promise<ComunicadoDetalhado> {
    return requisitar<ComunicadoDetalhado>('GET', `comunicados/${idComunicado}`, { signal });
  },

  async enviar(dados: EnviarComunicadoPayload): Promise<ComunicadoEnviado> {
    const res = await requisitar<ComunicadoEnviado>('POST', 'comunicados', { corpo: dados });
    dispararComunicadosMudou();
    return res;
  },

  async marcarComoLido(idComunicado: number): Promise<{ idComunicado: number; lido: boolean }> {
    const res = await requisitar<{ idComunicado: number; lido: boolean }>(
      'POST',
      `comunicados/${idComunicado}/lido`,
    );
    dispararComunicadosMudou();
    return res;
  },
};
