/**
 * Rubrica de correção (5 competências × 6 níveis). Define o que cada nota significa, para que
 * Tutores e Administração avaliem por critério e não por impressão.
 *
 * ATENÇÃO: os textos abaixo são um RASCUNHO baseado na matriz de competências do ENEM.
 * Devem ser revisados e aprovados pela professora antes do uso oficial.
 */

export const NIVEIS = [0, 40, 80, 120, 160, 200] as const;
export type Nivel = (typeof NIVEIS)[number];

/** Limite de caracteres de comentários e pareceres (precisa ser igual no backend). */
export const LIMITE_TEXTO = 2000;
export const LIMITE_SUGESTAO = 500;
export const LIMITE_TRECHO = 1000;

export interface Competencia {
  numero: 1 | 2 | 3 | 4 | 5;
  nome: string;
  pergunta: string;
  niveis: Record<Nivel, string>;
}

export const COMPETENCIAS: Competencia[] = [
  {
    numero: 1,
    nome: 'Domínio da norma culta',
    pergunta: 'O texto domina a modalidade escrita formal da língua portuguesa?',
    niveis: {
      200: 'Excelente domínio da norma culta e do registro formal. Desvios só como exceção, sem reincidência.',
      160: 'Bom domínio da norma culta, com poucos desvios gramaticais ou de convenções da escrita.',
      120: 'Domínio mediano: alguns desvios gramaticais e de convenções da escrita.',
      80: 'Domínio insuficiente: muitos desvios, que atrapalham em parte a leitura.',
      40: 'Domínio precário: desvios frequentes e de vários tipos.',
      0: 'Desconhecimento da modalidade escrita formal.',
    },
  },
  {
    numero: 2,
    nome: 'Compreensão da proposta e tipo textual',
    pergunta: 'O texto compreende o tema e é dissertativo-argumentativo?',
    niveis: {
      200: 'Desenvolve o tema com argumentação consistente e repertório sociocultural produtivo. Excelente domínio do texto dissertativo-argumentativo.',
      160: 'Desenvolve o tema com argumentação consistente e repertório legitimado. Bom domínio do tipo textual.',
      120: 'Desenvolvimento mediano, com repertório limitado aos textos motivadores ou pouco produtivo.',
      80: 'Aborda o tema completo, mas com domínio insuficiente do tipo textual ou cópia dos textos motivadores.',
      40: 'Tangencia o tema ou tem domínio precário do tipo textual.',
      0: 'Fuga ao tema ou não atende ao tipo dissertativo-argumentativo.',
    },
  },
  {
    numero: 3,
    nome: 'Seleção e organização de argumentos',
    pergunta: 'As informações e argumentos são selecionados e organizados em defesa de um ponto de vista?',
    niveis: {
      200: 'Projeto de texto estratégico: informações, fatos e opiniões consistentes, organizados e relacionados ao tema, com autoria clara.',
      160: 'Informações e argumentos organizados e relacionados ao tema, com indícios de autoria.',
      120: 'Informações relacionadas ao tema, mas pouco organizadas, ou limitadas aos textos motivadores.',
      80: 'Informações pouco relacionadas ao tema ou com contradições, sem defender bem o ponto de vista.',
      40: 'Informações pouco relacionadas ao tema, desorganizadas e contraditórias.',
      0: 'Informações não relacionadas ao tema, sem defesa de ponto de vista.',
    },
  },
  {
    numero: 4,
    nome: 'Coesão e mecanismos linguísticos',
    pergunta: 'As partes do texto estão bem articuladas com recursos coesivos variados?',
    niveis: {
      200: 'Articula bem as partes do texto, com repertório diversificado de recursos coesivos e sem inadequações.',
      160: 'Articula as partes com poucas inadequações e repertório diversificado de recursos coesivos.',
      120: 'Articulação mediana, com algumas inadequações e repertório pouco diversificado.',
      80: 'Articulação insuficiente, com muitas inadequações e repertório limitado.',
      40: 'Articulação precária das partes do texto.',
      0: 'Não articula as informações.',
    },
  },
  {
    numero: 5,
    nome: 'Proposta de intervenção',
    pergunta: 'O texto traz uma proposta de intervenção detalhada, que respeita os direitos humanos?',
    niveis: {
      200: 'Proposta muito bem elaborada e detalhada: agente, ação, meio, finalidade e detalhamento, ligada ao tema.',
      160: 'Proposta bem elaborada, com quatro dos cinco elementos (agente, ação, meio, finalidade, detalhamento).',
      120: 'Proposta mediana, com três dos cinco elementos.',
      80: 'Proposta insuficiente, com dois dos cinco elementos.',
      40: 'Proposta vaga ou precária, com apenas um elemento.',
      0: 'Não apresenta proposta ou desrespeita os direitos humanos.',
    },
  },
];

export function descricaoDoNivel(competencia: number, nota: number): string {
  const comp = COMPETENCIAS.find((c) => c.numero === competencia);
  return comp?.niveis[nota as Nivel] ?? '';
}

/** Tipos de erro das marcações. O backend aceita texto livre; aqui padronizamos para o Tutor. */
export interface TipoDeErro {
  valor: string;
  /** Competência a que a marcação serve de evidência (null = nenhuma) */
  competencia: 1 | 2 | 3 | 4 | 5 | null;
  /** Estilo visual da marcação: cor + tipo de sublinhado (para não depender só de cor) */
  estilo: 'ortografia' | 'gramatica' | 'pontuacao' | 'coesao' | 'argumento' | 'tema' | 'proposta' | 'outro';
}

export const TIPOS_DE_ERRO: TipoDeErro[] = [
  { valor: 'Ortografia', competencia: 1, estilo: 'ortografia' },
  { valor: 'Gramática', competencia: 1, estilo: 'gramatica' },
  { valor: 'Pontuação', competencia: 1, estilo: 'pontuacao' },
  { valor: 'Tema e tipo textual', competencia: 2, estilo: 'tema' },
  { valor: 'Argumentação', competencia: 3, estilo: 'argumento' },
  { valor: 'Coesão', competencia: 4, estilo: 'coesao' },
  { valor: 'Proposta de intervenção', competencia: 5, estilo: 'proposta' },
  { valor: 'Outro', competencia: null, estilo: 'outro' },
];

export function infoDoTipo(tipoErro: string): TipoDeErro {
  const normal = tipoErro.trim().toLowerCase();
  return (
    TIPOS_DE_ERRO.find((t) => t.valor.toLowerCase() === normal) ?? { valor: tipoErro, competencia: null, estilo: 'outro' }
  );
}