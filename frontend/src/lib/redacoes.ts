import type { TomDoBadge } from '@/components/ui/Badge/Badge';
import type { Redacao, StatusVersao, VersaoRedacao } from '@/types/redacoes';

export function ultimaVersao(redacao: Redacao): VersaoRedacao | undefined {
  return redacao.versoes[redacao.versoes.length - 1];
}

export function tituloDaRedacao(redacao: Redacao): string {
  return redacao.tema?.tituloTema ?? redacao.tarefa?.tituloTarefa ?? 'Redação sem tema';
}

/**
 * Texto do status que o ALUNO vê. O aluno nunca vê o ajuste pedido pela Administração:
 * AJUSTE_SOLICITADO aparece como "Em revisão final" 
 */
export function statusParaAluno(versao: VersaoRedacao | undefined): { rotulo: string; tom: TomDoBadge } {
  if (!versao) return { rotulo: 'Sem versão', tom: 'neutro' };
  const reescrita = versao.numeroVersao === 2;
  const tabela: Record<StatusVersao, { rotulo: string; tom: TomDoBadge }> = {
    RASCUNHO: reescrita ? { rotulo: 'Reescrita em andamento', tom: 'alerta' } : { rotulo: 'Rascunho', tom: 'neutro' },
    ENVIADA: { rotulo: reescrita ? 'Reescrita aguardando correção' : 'Aguardando correção', tom: 'alerta' },
    EM_CORRECAO: { rotulo: 'Em revisão final', tom: 'alerta' },
    EM_REVISAO_FINAL: { rotulo: 'Em revisão final', tom: 'alerta' },
    AJUSTE_SOLICITADO: { rotulo: 'Em revisão final', tom: 'alerta' },
    CORRIGIDA: { rotulo: reescrita ? 'Reescrita corrigida' : 'Corrigida', tom: 'sucesso' },
    CONCLUIDA: { rotulo: reescrita ? 'Reescrita corrigida' : 'Corrigida', tom: 'sucesso' },
    AGUARDANDO_REESCRITA: { rotulo: 'Reescrita solicitada', tom: 'alerta' },
    REESCRITA_SOLICITADA: { rotulo: 'Reescrita solicitada', tom: 'alerta' },
  };
  return tabela[versao.statusVersao];
}

export const rotuloDoFluxo = (tipo: Redacao['tipoFluxo']): string => (tipo === 'TREINO' ? 'Treino' : 'Avaliativa');

/** Só dá para excluir uma redação com uma única versão ainda em rascunho. */
export function podeExcluir(redacao: Redacao): boolean {
  return redacao.versoes.length === 1 && redacao.versoes[0]?.statusVersao === 'RASCUNHO';
}

export function contarPalavras(texto: string): number {
  return texto.trim().match(/\S+/g)?.length ?? 0;
}

export const MIN_LINHAS = 8;
export const MAX_LINHAS = 30;
export const CARACTERES_POR_LINHA = 75;

/**
 * Contagem de quebras de linha ('\n') no texto
 */
export function contarQuebrasLinha(texto: string): number {
  if (!texto) return 0;
  return (texto.match(/\n/g) || []).length;
}

/**
 * Contagem de linhas baseada no padrão ENEM (parágrafos e estimativa de 75 caracteres por linha).
 * Estritamente idêntica à regra de cálculo do backend (redacao.service.ts).
 */
export function contarLinhas(texto: string): number {
  if (!texto || !texto.trim()) return 0;
  const paragrafos = texto.split(/\r?\n/);
  let totalLinhas = 0;
  for (const p of paragrafos) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const linhasEstimadas = Math.ceil(trimmed.length / CARACTERES_POR_LINHA);
    totalLinhas += Math.max(1, linhasEstimadas);
  }
  return totalLinhas;
}

export function prazoEncerrado(prazoIso: string, agora: number = Date.now()): boolean {
  return new Date(prazoIso).getTime() < agora;
}

/** Só aceita endereços http(s). Evita links perigosos (ex.: javascript:) vindos da API. */
export function urlSegura(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

export function formatarHora(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(data);
}

/** Status como o Tutor e a Administração veem (mostram o ajuste pedido e a revisão da Administração). */
export function statusParaGestao(versao: VersaoRedacao | undefined): { rotulo: string; tom: TomDoBadge } {
  if (!versao) return { rotulo: 'Sem versão', tom: 'neutro' };
  const tabela: Record<StatusVersao, { rotulo: string; tom: TomDoBadge }> = {
    RASCUNHO: { rotulo: 'Rascunho do aluno', tom: 'neutro' },
    ENVIADA: { rotulo: 'Aguardando correção', tom: 'alerta' },
    EM_CORRECAO: { rotulo: 'Aguardando revisão do Admin', tom: 'alerta' },
    EM_REVISAO_FINAL: { rotulo: 'Aguardando revisão do Admin', tom: 'alerta' },
    AJUSTE_SOLICITADO: { rotulo: 'Ajuste solicitado', tom: 'perigo' },
    CORRIGIDA: { rotulo: 'Corrigida', tom: 'sucesso' },
    CONCLUIDA: { rotulo: 'Concluída', tom: 'sucesso' },
    AGUARDANDO_REESCRITA: { rotulo: 'Reescrita solicitada', tom: 'alerta' },
    REESCRITA_SOLICITADA: { rotulo: 'Reescrita solicitada', tom: 'alerta' },
  };
  return tabela[versao.statusVersao];
}
