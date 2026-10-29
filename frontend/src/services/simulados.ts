import { requisitar } from '@/lib/http';
import type {
  CriarSimuladoPayload,
  ItemCadernoErros,
  RefazerErrosPayload,
  RespostaSalva,
  ResultadoSimulado,
  SimuladoExecucao,
  SimuladoResumo,
} from '@/types/simulados';

export const simuladosService = {
  listar(signal?: AbortSignal): Promise<SimuladoResumo[]> {
    return requisitar<SimuladoResumo[]>('GET', 'simulados', { signal });
  },

  obter(idSimulado: number, signal?: AbortSignal): Promise<SimuladoExecucao> {
    return requisitar<SimuladoExecucao>('GET', `simulados/${idSimulado}`, { signal });
  },

  criar(dados: CriarSimuladoPayload): Promise<SimuladoExecucao> {
    return requisitar<SimuladoExecucao>('POST', 'simulados', { corpo: dados });
  },

  iniciar(idSimulado: number): Promise<SimuladoExecucao> {
    return requisitar<SimuladoExecucao>('POST', `simulados/${idSimulado}/iniciar`);
  },

  pausar(idSimulado: number): Promise<SimuladoExecucao> {
    return requisitar<SimuladoExecucao>('POST', `simulados/${idSimulado}/pausar`);
  },

  responder(idSimulado: number, idQuestao: number, resposta: string): Promise<RespostaSalva> {
    return requisitar<RespostaSalva>('PATCH', `simulados/${idSimulado}/respostas`, {
      corpo: { idQuestao, resposta },
    });
  },

  finalizar(idSimulado: number): Promise<ResultadoSimulado> {
    return requisitar<ResultadoSimulado>('POST', `simulados/${idSimulado}/finalizar`);
  },

  obterResultado(idSimulado: number, signal?: AbortSignal): Promise<ResultadoSimulado> {
    return requisitar<ResultadoSimulado>('GET', `simulados/${idSimulado}/resultado`, { signal });
  },

  // Caderno de Erros
  listarCadernoErros(idAssunto?: number, signal?: AbortSignal): Promise<ItemCadernoErros[]> {
    return requisitar<ItemCadernoErros[]>('GET', 'caderno-erros', {
      consulta: idAssunto ? { idAssunto } : undefined,
      signal,
    });
  },

  refazerErros(payload: RefazerErrosPayload = {}): Promise<SimuladoExecucao> {
    return requisitar<SimuladoExecucao>('POST', 'caderno-erros/refazer', { corpo: payload });
  },
};
