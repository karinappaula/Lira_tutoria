import { requisitar } from '@/lib/http';
import type {
  Assunto,
  CriarQuestaoPayload,
  FiltroQuestoes,
  Questao,
  RespostaQuestoesPaginadas,
} from '@/types/simulados';

export const questoesService = {
  listar(filtros?: FiltroQuestoes, signal?: AbortSignal): Promise<RespostaQuestoesPaginadas> {
    return requisitar<RespostaQuestoesPaginadas>('GET', 'questoes', {
      consulta: filtros as Record<string, string | number | boolean | null | undefined>,
      signal,
    });
  },

  listarAnos(signal?: AbortSignal): Promise<number[]> {
    return requisitar<number[]>('GET', 'questoes/anos', { signal });
  },

  obter(idQuestao: number, signal?: AbortSignal): Promise<Questao> {
    return requisitar<Questao>('GET', `questoes/${idQuestao}`, { signal });
  },

  criar(dados: CriarQuestaoPayload): Promise<Questao> {
    return requisitar<Questao>('POST', 'questoes', { corpo: dados });
  },

  atualizar(idQuestao: number, dados: CriarQuestaoPayload): Promise<Questao> {
    return requisitar<Questao>('PATCH', `questoes/${idQuestao}`, { corpo: dados });
  },

  excluir(idQuestao: number): Promise<void> {
    return requisitar<void>('DELETE', `questoes/${idQuestao}`);
  },

  inativar(idQuestao: number): Promise<Questao> {
    return requisitar<Questao>('POST', `questoes/${idQuestao}/inativar`);
  },

  ativar(idQuestao: number): Promise<Questao> {
    return requisitar<Questao>('POST', `questoes/${idQuestao}/ativar`);
  },

  // Taxonomia de Assuntos
  listarAssuntos(signal?: AbortSignal): Promise<Assunto[]> {
    return requisitar<Assunto[]>('GET', 'assuntos', { signal });
  },

  criarAssunto(nomeAssunto: string): Promise<Assunto> {
    return requisitar<Assunto>('POST', 'assuntos', { corpo: { nomeAssunto } });
  },

  atualizarAssunto(idAssunto: number, nomeAssunto: string): Promise<Assunto> {
    return requisitar<Assunto>('PATCH', `assuntos/${idAssunto}`, { corpo: { nomeAssunto } });
  },

  excluirAssunto(idAssunto: number): Promise<void> {
    return requisitar<void>('DELETE', `assuntos/${idAssunto}`);
  },
};
