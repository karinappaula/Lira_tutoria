'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Feather } from 'lucide-react';
import styles from '../login/page.module.scss';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import { esqueciSenhaApi } from '@/services/auth';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setMensagem(null);

    try {
      await esqueciSenhaApi(email);
      setMensagem('Se o e-mail estiver cadastrado, um link de recuperação será enviado.');
    } catch {
      setMensagem('Se o e-mail estiver cadastrado, um link de recuperação será enviado.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.brandHeader}>
        <Feather size={48} />
        <span className={styles.brandText}>LIRA</span>
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>Recuperar Senha</h1>
        <p className={styles.subtitle}>Digite o seu e-mail para receber o link</p>

        {mensagem && (
          <div style={{ color: '#2e7d32', marginBottom: '1rem', fontSize: '0.85rem' }}>{mensagem}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="EMAIL"
            type="email"
            placeholder="seu.email@escola.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" isLoading={carregando} style={{ marginTop: '1rem', width: '100%' }}>
            ENVIAR LINK
          </Button>

          <Link href="/login" className={styles.forgotLink}>
            Voltar ao Login
          </Link>
        </form>
      </div>
    </main>
  );
}