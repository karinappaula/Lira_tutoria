import { notFound } from 'next/navigation';
import { Vitrine } from './Vitrine';

/** Vitrine de componentes: só existe em desenvolvimento, para conferir o visual. */
export default function PaginaComponentes() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Vitrine />;
}
