import type { Metadata } from 'next';
import { ListaDeRedacoes } from './components/ListaDeRedacoes';

export const metadata: Metadata = { title: 'Minhas redações' };

export default function PaginaMinhasRedacoes() {
  return <ListaDeRedacoes />;
}