import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import styles from './Estados.module.scss';

interface EmptyProps {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}

/** Tela de dados vazios: "ainda não há nada aqui". */
export function EmptyState({ titulo, descricao, acao }: EmptyProps) {
  return (
    <div className={styles.estado}>
      <span className={styles.icone}>
        <Inbox size={26} aria-hidden="true" />
      </span>
      <h3 className={styles.titulo}>{titulo}</h3>
      {descricao && <p className={styles.descricao}>{descricao}</p>}
      {acao}
    </div>
  );
}

interface ErrorProps {
  mensagem: string;
  /** true quando o problema é de conexão (muda o ícone e o título) */
  conexao?: boolean;
  aoTentarNovamente?: () => void;
}

/** Tela de erro com botão para tentar de novo. */
export function ErrorState({ mensagem, conexao = false, aoTentarNovamente }: ErrorProps) {
  return (
    <div className={styles.estado} role="alert">
      <span className={`${styles.icone} ${styles.erro}`}>
        {conexao ? <WifiOff size={26} aria-hidden="true" /> : <AlertTriangle size={26} aria-hidden="true" />}
      </span>
      <h3 className={styles.titulo}>{conexao ? 'Sem conexão com o servidor' : 'Algo deu errado'}</h3>
      <p className={styles.descricao}>{mensagem}</p>
      {aoTentarNovamente && (
        <Button variante="secundario" onClick={aoTentarNovamente}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
