/**
 * Máscaras e validações de CPF, telefone e CEP.
 * O sistema LIRA não coleta esses dados hoje; os utilitários ficam prontos e
 * testados para o caso de algum formulário passar a usá-los.
 */

export const somenteDigitos = (v: string): string => v.replace(/\D/g, '');

export function mascararCpf(v: string): string {
  const d = somenteDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function validarCpf(v: string): boolean {
  const d = somenteDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: string, pesoInicial: number) => {
    const soma = [...base].reduce((acc, n, i) => acc + Number(n) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(d.slice(0, 9), 10) === Number(d[9]) && digito(d.slice(0, 10), 11) === Number(d[10]);
}

export function mascararTelefone(v: string): string {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function validarTelefone(v: string): boolean {
  const d = somenteDigitos(v);
  return (d.length === 10 || d.length === 11) && Number(d.slice(0, 2)) >= 11;
}

export function mascararCep(v: string): string {
  const d = somenteDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function validarCep(v: string): boolean {
  return somenteDigitos(v).length === 8;
}
