// Erros de aplicação reconhecidos pelo middleware global (tratarErros).
// Qualquer outro erro é tratado como falha inesperada (HTTP 500).

export interface DetalheValidacao {
  campo: string;
  mensagem: string;
}

// Dados de entrada malformados (HTTP 400). Lista os campos com problema.
export class ErroValidacao extends Error {
  constructor(public readonly detalhes: DetalheValidacao[]) {
    super("Dados inválidos.");
    this.name = "ErroValidacao";
  }
}

// Violação de regra de negócio. O status e o código vêm de quem lança o erro.
export class ErroNegocio extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly codigo: string = "REGRA_DE_NEGOCIO"
  ) {
    super(message);
    this.name = "ErroNegocio";
  }
}
