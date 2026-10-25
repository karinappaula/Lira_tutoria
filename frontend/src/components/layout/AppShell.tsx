'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button/Button';
import { ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { cx } from '@/lib/cx';
import { primeiroNome } from '@/lib/formatar';
import { ROTULO_PAPEL } from '@/lib/papeis';
import { authService } from '@/services/auth';
import { SessaoProvider, useSessao } from './SessaoProvider';
import styles from './AppShell.module.scss';
import { limparBackupsDeRascunho } from '@/lib/autosave';

export interface ItemDeMenu {
  href: string;
  rotulo: string;
  icone?: LucideIcon;
  /** Número exibido ao lado do rótulo, ex.: "Fila de correção (1)" */
  contador?: number;
}

interface Props {
  variante: 'padrao' | 'admin';
  menu: ItemDeMenu[];
  children: ReactNode;
}

function Cabecalho({ variante }: { variante: 'padrao' | 'admin' }) {
  const { estado } = useSessao();
  const router = useRouter();
  const toast = useToast();
  const [saindo, setSaindo] = useState(false);

  const nome = estado.situacao === 'ok' ? primeiroNome(estado.sessao.usuario.nome) : '';
  const papel = estado.situacao === 'ok' ? ROTULO_PAPEL[estado.sessao.papelAtivo] : '';

  async function sair() {
    setSaindo(true);
    limparBackupsDeRascunho(); // nenhuma cópia de redação fica no navegador depois de sair
    try {
      await authService.logout();
    } catch {
      toast.erro('Não foi possível encerrar a sessão no servidor, mas você será desconectado.');
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className={cx(styles.cabecalho, variante === 'admin' && styles.cabecalhoAdmin)}>
      <div className={styles.cabecalhoInterno}>
        <div className={styles.identidade}>
          <img src="/pena-lira.png" alt="LIRA" className={styles.pena} width={40} height={60} />
          <div>
            {variante === 'admin' ? (
              <>
                <h1 className={styles.saudacao}>Painel do Administrador</h1>
                <p className={styles.subtitulo}>{nome ? `Olá, ${nome}\n${papel}` : ' '}</p>
              </>
            ) : (
              <>
                <p className={styles.saudacao}>{nome ? `Olá, ${nome}` : ' '}</p>
                <p className={styles.subtitulo}>{papel || ' '}</p>
              </>
            )}
          </div>
        </div>

        <div className={styles.acoes}>
          <Button variante="secundario" icone={<LogOut size={16} aria-hidden="true" />} onClick={sair} carregando={saindo}>
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}

function Navegacao({ variante, menu }: Pick<Props, 'variante' | 'menu'>) {
  const caminho = usePathname();
  return (
    <nav className={cx(styles.nav, variante === 'admin' && styles.navAdmin)} aria-label="Menu principal">
      <ul className={styles.navLista}>
        {menu.map((item) => {
          const ativo = caminho === item.href || caminho.startsWith(`${item.href}/`);
          const Icone = item.icone;
          return (
            <li key={item.href}>
              <Link href={item.href} className={cx(styles.aba, ativo && styles.abaAtiva)} aria-current={ativo ? 'page' : undefined}>
                {Icone && <Icone size={16} aria-hidden="true" />}
                <span>{item.contador !== undefined ? `${item.rotulo} (${item.contador})` : item.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Conteudo({ children }: { children: ReactNode }) {
  const { estado, recarregar } = useSessao();
  if (estado.situacao === 'carregando') return <CarregandoPagina rotulo="Carregando sua sessão" />;
  if (estado.situacao === 'erro') {
    return <ErrorState mensagem={estado.erro.message} conexao={estado.erro.ehErroDeConexao} aoTentarNovamente={recarregar} />;
  }
  return <>{children}</>;
}

/** Estrutura das áreas logadas: cabeçalho, abas de navegação e conteúdo. */
export function AppShell({ variante, menu, children }: Props) {
  return (
    <SessaoProvider>
      <div className={styles.pagina}>
        <Cabecalho variante={variante} />
        <Navegacao variante={variante} menu={menu} />
        <main className={styles.principal} id="conteudo">
          <Conteudo>{children}</Conteudo>
        </main>
      </div>
    </SessaoProvider>
  );
}