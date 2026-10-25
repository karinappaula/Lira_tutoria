import 'server-only';

/** Endereço do backend. Só existe no servidor do Next.js (nunca vai para o navegador). */
export function getBackendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) {
    throw new Error('Variável de ambiente BACKEND_URL não definida. Copie .env.example para .env.local.');
  }
  return url.replace(/\/+$/, '');
}
