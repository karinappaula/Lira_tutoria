import { requisitar } from '@/lib/http';
import type {
  DesempenhoRedacoesTutorResponse,
  DesempenhoSimuladosTutorResponse,
  DesempenhoTurmaItem,
  DesempenhoTutorItem,
  IndicadoresAlunoGestaoResponse,
  IndicadoresAlunoResponse,
} from '@/types/indicadores';

export const indicadoresService = {
  // Aluno
  obterIndicadoresAluno(signal?: AbortSignal): Promise<IndicadoresAlunoResponse> {
    return requisitar<IndicadoresAlunoResponse>('GET', 'indicadores/aluno', { signal });
  },

  // Tutor
  obterDesempenhoRedacoesTutor(signal?: AbortSignal): Promise<DesempenhoRedacoesTutorResponse> {
    return requisitar<DesempenhoRedacoesTutorResponse>('GET', 'indicadores/tutor/redacoes', { signal });
  },

  obterDesempenhoSimuladosTutor(signal?: AbortSignal): Promise<DesempenhoSimuladosTutorResponse> {
    return requisitar<DesempenhoSimuladosTutorResponse>('GET', 'indicadores/tutor/simulados', { signal });
  },

  // Drill-down Gestão (Tutor dos seus alunos / Admin de qualquer um)
  obterIndicadoresAlunoGestao(idAluno: number, signal?: AbortSignal): Promise<IndicadoresAlunoGestaoResponse> {
    return requisitar<IndicadoresAlunoGestaoResponse>('GET', `indicadores/alunos/${idAluno}`, { signal });
  },

  // Admin
  obterDesempenhoTurmas(idTurma?: number, signal?: AbortSignal): Promise<DesempenhoTurmaItem[]> {
    return requisitar<DesempenhoTurmaItem[]>('GET', 'indicadores/admin/turmas', {
      consulta: idTurma !== undefined ? { idTurma } : undefined,
      signal,
    });
  },

  obterDesempenhoTutores(signal?: AbortSignal): Promise<DesempenhoTutorItem[]> {
    return requisitar<DesempenhoTutorItem[]>('GET', 'indicadores/admin/tutores', { signal });
  },
};
