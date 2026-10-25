import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { HOME_DO_PAPEL, NOMES_DE_COOKIE, ehPapel } from '@/lib/papeis';

/** A raiz do site só encaminha: para a área do papel (logado) ou para o login. */
export default async function Raiz() {
  const jar = await cookies();
  const papel = jar.get(NOMES_DE_COOKIE.papel)?.value;
  if (jar.get(NOMES_DE_COOKIE.token) && ehPapel(papel)) redirect(HOME_DO_PAPEL[papel]);
  redirect('/login');
}
