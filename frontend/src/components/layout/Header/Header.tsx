import React from 'react';
import styles from './Header.module.scss';
import { Bell, LogOut, Feather } from 'lucide-react';

interface HeaderProps {
  nomeUsuario: string;
  papel: string;
  turmaNome?: string;
  naoLidosCount?: number;
  onLogout: () => void;
}

export default function Header({
  nomeUsuario,
  papel,
  turmaNome,
  naoLidosCount = 0,
  onLogout,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Feather className={styles.logoIcon} size={28} />
        <span className={styles.brandTitle}>LIRA</span>
      </div>

      <div className={styles.userSection}>
        <div className={styles.greeting}>
          <span className={styles.hello}>
            Olá, <strong>{nomeUsuario}</strong>
          </span>
          {turmaNome && <span className={styles.turmaTag}>Turma {turmaNome}</span>}
          {!turmaNome && <span className={styles.turmaTag}>{papel}</span>}
        </div>

        <div className={styles.actions}>
          <button className={styles.iconButton} title="Comunicados">
            <Bell size={20} />
            {naoLidosCount > 0 && <span className={styles.badgeCount}>{naoLidosCount}</span>}
          </button>

          <button onClick={onLogout} className={styles.logoutButton} title="Sair">
            <span>Sair</span>
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}