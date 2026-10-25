import { NextResponse, type NextRequest } from 'next/server';
import { HOME_DO_PAPEL, NOMES_DE_COOKIE, PREFIXO_DO_PAPEL, ehPapel } from '@/lib/papeis';

/**
 * Protege as rotas por papel. Esta checagem é de EXPERIÊNCIA (evita mostrar telas
 * que o usuário não pode usar). A autorização de verdade acontece no backend,
 * que valida o token a cada requisição.
 */

const ROTAS_PUBLICAS = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(NOMES_DE_COOKIE.token)?.value;
  const papelBruto = req.cookies.get(NOMES_DE_COOKIE.papel)?.value;
  const papel = token && ehPapel(papelBruto) ? papelBruto : null;

  const irPara = (destino: string) => NextResponse.redirect(new URL(destino, req.url));

  // Vitrine de componentes: livre só em desenvolvimento (em produção a página responde 404).
  if (pathname === '/componentes' && process.env.NODE_ENV !== 'production') return NextResponse.next();

  // Escolha de papel: só quem acabou de fazer login com 2 papéis.
  if (pathname === '/escolher-papel') {
    return req.cookies.get(NOMES_DE_COOKIE.pendente) ? NextResponse.next() : irPara('/login');
  }

  // Rotas públicas: quem já está logado vai para a sua área.
  if (ROTAS_PUBLICAS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`))) {
    return papel ? irPara(HOME_DO_PAPEL[papel]) : NextResponse.next();
  }

  // Rotas privadas: precisam de sessão e do papel correto.
  if (!papel) return irPara('/login');

  for (const [papelDaRota, prefixo] of Object.entries(PREFIXO_DO_PAPEL)) {
    if ((pathname === prefixo || pathname.startsWith(`${prefixo}/`)) && papelDaRota !== papel) {
      return irPara(HOME_DO_PAPEL[papel]);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // tudo, exceto API, arquivos internos do Next e arquivos estáticos
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)',
  ],
};
