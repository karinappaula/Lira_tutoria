import type { Metadata } from 'next';
import { FilaDeCorrecao } from '../components/FilaDeCorrecao';

export const metadata: Metadata = { title: 'Fila de correção' };

export default function PaginaFila() {
  return <FilaDeCorrecao />;
}