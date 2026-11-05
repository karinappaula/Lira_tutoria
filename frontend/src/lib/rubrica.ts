/**
 * Rubrica de correção (5 competências × 6 níveis). Define o que cada nota significa, para que
 * Tutores e Administração avaliem por critério e não por impressão.
 *
 * Critérios oficiais usados na avaliação das redações.
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
      200: 'Demonstra excelente domínio da modalidade escrita formal da língua portuguesa e de escolha de registro.',
      160: 'Demonstra bom domínio da modalidade escrita formal da língua portuguesa e de escolha de registro, com poucos desvios gramaticais e de convenções da escrita.',
      120: 'Demonstra domínio mediano da modalidade escrita formal da língua portuguesa e de escolha de registro, com alguns desvios gramaticais e de convenções da escrita.',
      80: 'Demonstra domínio insuficiente da modalidade escrita formal da língua portuguesa, com muitos desvios gramaticais, de escolha de registro e de convenções da escrita.',
      40: 'Demonstra domínio precário da modalidade escrita formal da língua portuguesa, de forma sistemática, com diversificados e frequentes desvios gramaticais, de escolha de registro e de convenções da escrita.',
      0: 'Demonstra desconhecimento da modalidade escrita formal da língua portuguesa.',
      }
    },
  {
    numero: 2,
    nome: 'Compreensão da proposta e tipo textual',
    pergunta: 'O texto compreende o tema e é dissertativo-argumentativo?',
    niveis: {
      200: 'Desenvolve o tema por meio de argumentação consistente, a partir de um repertório sociocultural produtivo, e apresenta excelente domínio do texto dissertativo-argumentativo.',
      160: 'Desenvolve o tema por meio de argumentação consistente e apresenta bom domínio do texto dissertativo-argumentativo, com proposição, argumentação e conclusão.',
      120: 'Desenvolve o tema por meio de argumentação previsível e apresenta domínio mediano do texto dissertativo-argumentativo, com proposição, argumentação e conclusão.',
      80: 'Desenvolve o tema recorrendo à cópia de trechos dos textos motivadores ou apresenta domínio insuficiente do texto dissertativo-argumentativo, não atendendo à estrutura com proposição, argumentação e conclusão.',
      40: 'Apresenta o assunto, tangenciando o tema, ou demonstra domínio precário do texto dissertativo-argumentativo, com traços constantes de outros tipos textuais.',
      0: 'Fuga ao tema/não atendimento à estrutura dissertativo-argumentativa.',
    },
  },
  {
    numero: 3,
    nome: 'Seleção e organização de argumentos',
    pergunta: 'As informações e argumentos são selecionados e organizados em defesa de um ponto de vista?',
    niveis: {
      200: 'Apresenta informações, fatos e opiniões relacionados ao tema proposto, de forma consistente e organizada, configurando autoria, em defesa de um ponto de vista.',
      160: 'Apresenta informações, fatos e opiniões relacionados ao tema, de forma organizada, com indício de autoria, em defesa de um ponto de vista.',
      120: 'Apresenta informações, fatos e opiniões relacionados ao tema, limitados aos argumentos dos textos motivadores e pouco organizados, em defesa de um ponto de vista.',
      80: 'Apresenta informações, fatos e opiniões relacionados ao tema, mas desorganizados ou contraditórios e limitados aos argumentos dos textos motivadores, em defesa de um ponto de vista.',
      40: 'Apresenta informações, fatos e opiniões pouco relacionados ao tema ou incoerentes e sem defesa de um ponto de vista.',
      0: 'Apresenta informações, fatos e opiniões não relacionados ao tema e sem defesa de um ponto de vista.',
    },
  },
  {
    numero: 4,
    nome: 'Coesão e mecanismos linguísticos',
    pergunta: 'As partes do texto estão bem articuladas com recursos coesivos variados?',
    niveis: {
      200: 'Articula bem as partes do texto e apresenta repertório diversificado de recursos coesivos.',
      160: 'Articula as partes do texto, com poucas inadequações, e apresenta repertório diversificado de recursos coesivos.',
      120: 'Articula as partes do texto, de forma mediana, com inadequações, e apresenta repertório pouco diversificado de recursos coesivos.',
      80: 'Articula as partes do texto, de forma insuficiente, com muitas inadequações, e apresenta repertório limitado de recursos coesivos.',
      40: 'Articula as partes do texto de forma precária.',
      0: 'Não articula as informações.',
    },
  },
  {
    numero: 5,
    nome: 'Proposta de intervenção',
    pergunta: 'O texto traz uma proposta de intervenção detalhada, que respeita os direitos humanos?',
    niveis: {
      200: 'Elabora muito bem proposta de intervenção, detalhada, relacionada ao tema e articulada à discussão desenvolvida no texto.',
      160: 'Elabora bem proposta de intervenção relacionada ao tema e articulada à discussão desenvolvida no texto.',
      120: 'Elabora, de forma mediana, proposta de intervenção relacionada ao tema e articulada à discussão desenvolvida no texto.',
      80: 'Elabora, de forma insuficiente, proposta de intervenção relacionada ao tema, ou não articulada com a discussão desenvolvida no texto.',
      40: 'Apresenta proposta de intervenção vaga, precária ou relacionada apenas ao assunto.',
      0: 'Não apresenta proposta de intervenção ou apresenta proposta não relacionada ao tema ou ao assunto.',
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

export const CATEGORIAS_MARCACAO = [
  'Tema',
  'Argumentação',
  'Coesão',
  'Gramática',
  'Proposta de Intervenção',
] as const;

export const TIPOS_DE_ERRO: TipoDeErro[] = [
  { valor: 'Tema', competencia: 2, estilo: 'tema' },
  { valor: 'Argumentação', competencia: 3, estilo: 'argumento' },
  { valor: 'Coesão', competencia: 4, estilo: 'coesao' },
  { valor: 'Gramática', competencia: 1, estilo: 'gramatica' },
  { valor: 'Proposta de Intervenção', competencia: 5, estilo: 'proposta' },
  { valor: 'Ortografia', competencia: 1, estilo: 'ortografia' },
  { valor: 'Pontuação', competencia: 1, estilo: 'pontuacao' },
  { valor: 'Tema e tipo textual', competencia: 2, estilo: 'tema' },
  { valor: 'Proposta de intervenção', competencia: 5, estilo: 'proposta' },
  { valor: 'Outro', competencia: null, estilo: 'outro' },
];

export function infoDoTipo(tipoErro: string): TipoDeErro {
  const normal = tipoErro.trim().toLowerCase();
  const exato = TIPOS_DE_ERRO.find((t) => t.valor.toLowerCase() === normal);
  if (exato) return exato;
  if (normal.startsWith('tema')) return { valor: tipoErro, competencia: 2, estilo: 'tema' };
  if (normal.startsWith('argument')) return { valor: tipoErro, competencia: 3, estilo: 'argumento' };
  if (normal.startsWith('coes')) return { valor: tipoErro, competencia: 4, estilo: 'coesao' };
  if (normal.startsWith('gramat')) return { valor: tipoErro, competencia: 1, estilo: 'gramatica' };
  if (normal.startsWith('propost')) return { valor: tipoErro, competencia: 5, estilo: 'proposta' };
  return { valor: tipoErro, competencia: null, estilo: 'outro' };
}