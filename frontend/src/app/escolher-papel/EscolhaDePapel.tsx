'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, GraduationCap, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { HOME_DO_PAPEL, ROTULO_PAPEL } from '@/lib/papeis';
import { authService } from '@/services/auth';
import type { PapelUsuario } from '@/types/api';
import styles from './escolher-papel.module.scss';

const ICONE: Record<PapelUsuario, LucideIcon> = { ALUNO: Users, TUTOR: GraduationCap, ADMINISTRADOR: ShieldCheck };

export function EscolhaDePapel({ papeis }: { papeis: PapelUsuario[] }) {
  const router = useRouter();
  const [escolhendo, setEscolhendo] = useState<PapelUsuario | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(papel: PapelUsuario) {
    setEscolhendo(papel);
    setErro(null);
    try {
      const r = await authService.selecionarPapel(papel);
      if (r.tipo === 'sessao') {
        router.replace(HOME_DO_PAPEL[r.papelAtivo]);
        router.refresh();
      }
    } catch (e) {
      setErro(mensagemDeErro(e));
      // Tentativa expirada (10 min): volta ao login
      if (e instanceof ApiError && e.status === 401) window.setTimeout(() => router.replace('/login'), 1800);
      setEscolhendo(null);
    }
  }

  return (
    <main className={styles.pagina} id="conteudo">
      <header className={styles.topo}>
        <h1 className={styles.titulo}>Qual área deseja acessar?</h1>
        <p className={styles.subtitulo}>Selecione {papeis.map((p) => ROTULO_PAPEL[p]).join(' ou ')} para continuar.</p>
      </header>

      {erro && (
        <div className={styles.aviso}>
          <Alerta tom="erro">{erro}</Alerta>
        </div>
      )}

      <ul className={styles.cartoes}>
        {papeis.map((papel) => {
          const Icone = ICONE[papel];
          const rotulo = ROTULO_PAPEL[papel];
          return (
            <li key={papel} className={styles.cartao}>
              <span className={styles.icone}>
                <Icone size={24} aria-hidden="true" />
              </span>
              <h2 className={styles.cartaoTitulo}>{rotulo}</h2>
              <p className={styles.cartaoTexto}>Acesse sua conta como {papel === 'ALUNO' ? 'um aluno' : papel === 'TUTOR' ? 'um tutor' : 'administrador'}.</p>
              <Button
                larguraTotal
                carregando={escolhendo === papel}
                disabled={escolhendo !== null}
                onClick={() => escolher(papel)}
                icone={<ArrowRight size={16} aria-hidden="true" />}
              >
                {`Entrar em ${rotulo}`}
              </Button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
