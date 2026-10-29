/** Datas chegam da API em ISO 8601 (UTC) e são exibidas no horário de Brasília. */
const FUSO = 'America/Sao_Paulo';

export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  );
}

export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function formatarTempoSegundos(segundosTotais: number | null | undefined): string {
  if (segundosTotais === null || segundosTotais === undefined || isNaN(segundosTotais) || segundosTotais < 0) {
    return '00:00';
  }
  const horas = Math.floor(segundosTotais / 3600);
  const minutos = Math.floor((segundosTotais % 3600) / 60);
  const segundos = Math.floor(segundosTotais % 60);

  const mm = String(minutos).padStart(2, '0');
  const ss = String(segundos).padStart(2, '0');

  if (horas > 0) {
    const hh = String(horas).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
