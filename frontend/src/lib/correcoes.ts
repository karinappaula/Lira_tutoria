import type { CorrecaoDaVersao, Decimal, VersaoComCorrecoes } from '@/types/correcoes';

export function numero(valor: Decimal | undefined): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export function ultimaCorrecao(versao: VersaoComCorrecoes): CorrecaoDaVersao | undefined {
  return versao.correcoes[versao.correcoes.length - 1];
}

export interface CompetenciaCorrigida {
  numero: 1 | 2 | 3 | 4 | 5;
  nota: number;
  comentario: string;
}

export function competenciasDe(c: CorrecaoDaVersao): CompetenciaCorrigida[] {
  return [
    { numero: 1, nota: numero(c.notaComp1), comentario: c.comentarioComp1 ?? '' },
    { numero: 2, nota: numero(c.notaComp2), comentario: c.comentarioComp2 ?? '' },
    { numero: 3, nota: numero(c.notaComp3), comentario: c.comentarioComp3 ?? '' },
    { numero: 4, nota: numero(c.notaComp4), comentario: c.comentarioComp4 ?? '' },
    { numero: 5, nota: numero(c.notaComp5), comentario: c.comentarioComp5 ?? '' },
  ];
}

export function notaFinal(c: CorrecaoDaVersao): number {
  return c.notaTotal !== null ? numero(c.notaTotal) : competenciasDe(c).reduce((t, x) => t + x.nota, 0);
}

export interface MarcaVisual {
  chave: string | number;
  inicio: number;
  fim: number;
  tipoErro: string;
}

export interface Segmento {
  inicio: number;
  fim: number;
  texto: string;
  marca?: MarcaVisual;
}

export function sobrepoe(a: { inicio: number; fim: number }, b: { inicio: number; fim: number }): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

/** Divide o texto em pedaços (com e sem marcação). Marcações sobrepostas são ignoradas. */
export function construirSegmentos(texto: string, marcas: MarcaVisual[]): Segmento[] {
  const validas = marcas
    .filter((m) => m.inicio >= 0 && m.fim <= texto.length && m.fim > m.inicio)
    .sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
  const segmentos: Segmento[] = [];
  let cursor = 0;
  for (const marca of validas) {
    if (marca.inicio < cursor) continue;
    if (marca.inicio > cursor) segmentos.push({ inicio: cursor, fim: marca.inicio, texto: texto.slice(cursor, marca.inicio) });
    segmentos.push({ inicio: marca.inicio, fim: marca.fim, texto: texto.slice(marca.inicio, marca.fim), marca });
    cursor = marca.fim;
  }
  if (cursor < texto.length || segmentos.length === 0) segmentos.push({ inicio: cursor, fim: texto.length, texto: texto.slice(cursor) });
  return segmentos;
}

export function statusDaCorrecaoRotulo(status: CorrecaoDaVersao['statusAprovacao']): { rotulo: string; tom: 'sucesso' | 'alerta' | 'perigo' } {
  if (status === 'APROVADA') return { rotulo: 'Aprovada', tom: 'sucesso' };
  if (status === 'LIBERADA') return { rotulo: 'Liberada', tom: 'sucesso' };
  if (status === 'AJUSTE_SOLICITADO') return { rotulo: 'Ajuste solicitado', tom: 'perigo' };
  return { rotulo: 'Aguardando revisão do Admin', tom: 'alerta' };
}