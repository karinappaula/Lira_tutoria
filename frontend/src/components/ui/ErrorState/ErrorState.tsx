import React from 'react';
import styles from './ErrorState.module.scss';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Falha ao carregar dados.', onRetry }: ErrorStateProps) {
  return (
    <div className={styles.container}>
      <AlertTriangle size={40} className={styles.icon} />
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className={styles.retryButton}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}