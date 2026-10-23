import React from 'react';
import styles from './EmptyState.module.scss';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({ message = 'Nenhum registro encontrado.' }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <Inbox size={40} className={styles.icon} />
      <p>{message}</p>
    </div>
  );
}