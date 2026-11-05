'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button/Button';
import { ErrorState } from '@/components/ui/Estados/Estados';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { cx } from '@/lib/cx';
import { primeiroNome } from '@/lib/formatar';
import { ROTULO_PAPEL } from '@/lib/papeis';
import { authService } from '@/services/auth';
import { comunicadosService, EVENTO_COMUNICADOS_MUDOU } from '@/services/comunicados';
import { RodapeGlobal } from './RodapeGlobal';
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

function formatarTituloAba(rotulo: string): string {
  if (!rotulo) return '';
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1).toLowerCase();
}

function SinoComunicados() {
  const { estado } = useSessao();
  const [naoLidos, setNaoLidos] = useState(0);

  const papel = estado.situacao === 'ok' ? estado.sessao.papelAtivo : null;
  const link =
    papel === 'ADMINISTRADOR'
      ? '/admin/comunicados'
      : papel === 'TUTOR'
        ? '/tutor/comunicados'
        : '/aluno/comunicados';

  useEffect(() => {
    if (!papel || papel === 'ADMINISTRADOR') return;

    let ativo = true;
    function carregar() {
      if (document.visibilityState !== 'visible') return;
      comunicadosService
        .contarNaoLidos()
        .then((res) => {
          if (ativo) setNaoLidos(res.naoLidos);
        })
        .catch(() => {});
    }

    carregar();
    window.addEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
    window.addEventListener('focus', carregar);
    const intervalo = window.setInterval(carregar, 30_000);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_COMUNICADOS_MUDOU, carregar);
      window.removeEventListener('focus', carregar);
      window.clearInterval(intervalo);
    };
  }, [papel]);

  if (!papel || papel === 'ADMINISTRADOR') return null;

  return (
    <Link
      href={link}
      className={styles.botaoSino}
      aria-label={naoLidos > 0 ? `${naoLidos} comunicados não lidos` : 'Ver comunicados'}
      title="Comunicados"
    >
      <Bell size={18} aria-hidden="true" />
      {naoLidos > 0 && <span className={styles.badgeSino}>{naoLidos > 99 ? '99+' : naoLidos}</span>}
    </Link>
  );
}

function Cabecalho({
  variante,
  menuAberto,
  aoAlternarMenu,
  aoSair,
  saindo,
}: {
  variante: 'padrao' | 'admin';
  menuAberto: boolean;
  aoAlternarMenu: () => void;
  aoSair: () => void;
  saindo: boolean;
}) {
  const { estado } = useSessao();

  const nome = estado.situacao === 'ok' ? primeiroNome(estado.sessao.usuario.nome) : '';
  const papel = estado.situacao === 'ok' ? ROTULO_PAPEL[estado.sessao.papelAtivo] : '';
  const contexto = estado.situacao === 'ok' ? estado.sessao.contexto : undefined;

  const elementosContexto = (
    <>
      <span className={styles.badgePapel}>{papel || (variante === 'admin' ? 'Administrador' : ' ')}</span>
      {variante === 'admin' && nome && <span className={styles.contextoItem}>{nome}</span>}
      {variante !== 'admin' && contexto?.turma && (
        <span className={styles.contextoItem}>
          Turma: <strong>{contexto.turma}</strong>
        </span>
      )}
      {variante !== 'admin' && contexto?.tutor && (
        <span className={styles.contextoItem}>
          Tutor: <strong>{contexto.tutor}</strong>
        </span>
      )}
    </>
  );

  return (
    <header className={cx(styles.cabecalho, variante === 'admin' && styles.cabecalhoAdmin)}>
      <div className={styles.cabecalhoInterno}>
        <div className={styles.barraPrincipal}>
          <div className={styles.identidade}>
            <img src="/pena-lira.png" alt="LIRA" className={styles.pena} width={40} height={60} />
            <div className={styles.titulosUsuario}>
              {variante === 'admin' ? (
                <h1 className={styles.saudacao}>Painel do Administrador</h1>
              ) : (
                <p className={styles.saudacao}>{nome ? `Olá, ${nome}` : ' '}</p>
              )}
              {/* Contexto Desktop (>= 768px) */}
              <div className={styles.contextoDesktop}>{elementosContexto}</div>
            </div>
          </div>

          <div className={styles.acoes}>
            {variante !== 'admin' && <SinoComunicados />}

            {/* Botão Sair avulso: visível apenas no Desktop/Tablet (>= 768px), oculto no mobile */}
            <div className={styles.botaoSairSuperior}>
              <Button
                variante="secundario"
                icone={<LogOut size={16} aria-hidden="true" />}
                onClick={aoSair}
                carregando={saindo}
              >
                Sair
              </Button>
            </div>

            {/* Botão Hambúrguer Mobile (< 768px): reposicionado para o lado direito da barra superior, alinhado ao lado do sino */}
            <button
              type="button"
              className={styles.botaoHamburger}
              onClick={aoAlternarMenu}
              aria-label={menuAberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              aria-expanded={menuAberto}
            >
              {menuAberto ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Contexto Mobile (< 768px): ocupa toda a largura útil sem truncar nem comprimir */}
        <div className={styles.contextoMobile}>{elementosContexto}</div>
      </div>
    </header>
  );
}

function Navegacao({
  variante,
  menu,
  menuAberto,
  aoFecharMenu,
  aoSair,
  saindo,
}: Pick<Props, 'variante' | 'menu'> & {
  menuAberto: boolean;
  aoFecharMenu: () => void;
  aoSair: () => void;
  saindo: boolean;
}) {
  const caminho = usePathname();

  return (
    <>
      {/* Navegação Desktop e Tablet (com overflow-x: auto) */}
      <nav className={cx(styles.nav, variante === 'admin' && styles.navAdmin)} aria-label="Menu principal">
        <ul className={styles.navLista}>
          {menu.map((item) => {
            const ativo = caminho === item.href || caminho.startsWith(`${item.href}/`);
            const Icone = item.icone;
            const rotuloFormatado = formatarTituloAba(item.rotulo);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cx(styles.aba, ativo && styles.abaAtiva)}
                  aria-current={ativo ? 'page' : undefined}
                >
                  {Icone && <Icone size={16} aria-hidden="true" />}
                  <span>{item.contador !== undefined ? `${rotuloFormatado} (${item.contador})` : rotuloFormatado}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Menu Hambúrguer Retrátil (Mobile < 768px) */}
      {menuAberto && (
        <div className={styles.menuDrawerOverlay} onClick={aoFecharMenu}>
          <nav
            className={styles.menuDrawer}
            aria-label="Menu de navegação móvel"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.menuDrawerCabecalho}>
              <div className={styles.identidadeDrawer}>
                <img src="/pena-lira.png" alt="LIRA" className={styles.penaDrawer} width={28} height={42} />
                <span className={styles.tituloMenuDrawer}>LIRA</span>
              </div>
              <button
                type="button"
                className={styles.botaoFecharDrawer}
                onClick={aoFecharMenu}
                aria-label="Fechar menu"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <ul className={styles.menuDrawerLista}>
              {menu.map((item) => {
                const ativo = caminho === item.href || caminho.startsWith(`${item.href}/`);
                const Icone = item.icone;
                const rotuloFormatado = formatarTituloAba(item.rotulo);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cx(styles.itemDrawerLink, ativo && styles.itemDrawerAtivo)}
                      onClick={aoFecharMenu}
                      aria-current={ativo ? 'page' : undefined}
                    >
                      {Icone && <Icone size={18} aria-hidden="true" />}
                      <span className={styles.rotuloDrawer}>{rotuloFormatado}</span>
                      {item.contador !== undefined && (
                        <span className={styles.badgeContadorDrawer}>{item.contador}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Botão Sair dentro do Drawer do Menu Hambúrguer */}
            <div className={styles.menuDrawerRodape}>
              <Button
                variante="secundario"
                icone={<LogOut size={16} aria-hidden="true" />}
                onClick={() => {
                  aoFecharMenu();
                  aoSair();
                }}
                carregando={saindo}
                larguraTotal
              >
                Sair
              </Button>
            </div>
          </nav>
        </div>
      )}
    </>
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

function ShellComSessao({ variante, menu, children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const [saindo, setSaindo] = useState(false);

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
    <div className={styles.pagina}>
      <Cabecalho
        variante={variante}
        menuAberto={menuAberto}
        aoAlternarMenu={() => setMenuAberto((aberto) => !aberto)}
        aoSair={sair}
        saindo={saindo}
      />
      <Navegacao
        variante={variante}
        menu={menu}
        menuAberto={menuAberto}
        aoFecharMenu={() => setMenuAberto(false)}
        aoSair={sair}
        saindo={saindo}
      />
      <main className={styles.principal} id="conteudo">
        <Conteudo>{children}</Conteudo>
      </main>
      <RodapeGlobal />
    </div>
  );
}

/** Estrutura das áreas logadas: cabeçalho com contexto, navegação com hambúrguer mobile, conteúdo e rodapé global. */
export function AppShell({ variante, menu, children }: Props) {
  return (
    <SessaoProvider>
      <ShellComSessao variante={variante} menu={menu}>
        {children}
      </ShellComSessao>
    </SessaoProvider>
  );
}
