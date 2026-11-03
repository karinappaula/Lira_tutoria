import styles from './RodapeGlobal.module.scss';

export function RodapeGlobal() {
  return (
    <footer className={styles.rodapeGlobal}>
      <div className={styles.rodapeInterno}>
        <p className={styles.rodapeTexto}>
          © {new Date().getFullYear()} <strong>LIRA</strong> — Linguagem e Interpretação para Redações Autorais.
        </p>
        <div className={styles.rodapeLinks}>
          <span>Plataforma Educacional</span>
          <span>•</span>
          <span>Acessibilidade</span>
          <span>•</span>
          <span>Suporte ao Aluno e Tutor</span>
        </div>
      </div>
    </footer>
  );
}
