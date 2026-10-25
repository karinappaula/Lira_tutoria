/** Validações de formulário reutilizáveis. Cada função devolve a mensagem de erro, ou undefined se estiver ok. */

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarObrigatorio(valor: string, nomeDoCampo: string): string | undefined {
  return valor.trim() === '' ? `Informe ${nomeDoCampo}.` : undefined;
}

export function validarNome(valor: string): string | undefined {
  const v = valor.trim();
  if (v === '') return 'Informe seu nome completo.';
  if (v.length < 3) return 'O nome precisa ter pelo menos 3 letras.';
  return undefined;
}

export function validarEmail(valor: string): string | undefined {
  const v = valor.trim();
  if (v === '') return 'Informe seu e-mail.';
  if (!REGEX_EMAIL.test(v)) return 'Digite um e-mail válido, como nome@escola.com.';
  return undefined;
}

export function validarSenhaMinima(valor: string, minimo = 8): string | undefined {
  if (valor === '') return 'Informe sua senha.';
  if (valor.length < minimo) return `A senha precisa ter pelo menos ${minimo} caracteres.`;
  return undefined;
}

export function validarConfirmacaoSenha(senha: string, confirmacao: string): string | undefined {
  if (confirmacao === '') return 'Repita a senha para confirmar.';
  if (senha !== confirmacao) return 'As senhas não são iguais.';
  return undefined;
}

/** Código de convite, ex.: TUT-ABC123 ou ALU-ABC123 */
export function validarCodigoConvite(valor: string): string | undefined {
  const v = valor.trim().toUpperCase();
  if (v === '') return 'Informe o código do convite.';
  if (!/^(TUT|ALU)-[A-Z0-9]{4,}$/.test(v)) return 'O código deve ter o formato TUT-ABC123 ou ALU-ABC123.';
  return undefined;
}