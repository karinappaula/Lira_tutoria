'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Feather } from 'lucide-react';
import styles from '../login/page.module.scss';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import { redefinirSenhaApi } from '@/services/auth';
import { ErroAPI } from '@/types/api';

function RedefinirSenhaForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [novaSenha, setNovaSenha] = useState('');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagem(null);

    if (novaSenha.length < 8) {
      setErro('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setCarregando(true);

    try {
      await redefinirSenhaApi(token, novaSenha);
      setMensagem('Senha redefinida com sucesso! Redirecionando...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      const erroPayload = err as ErroAPI;
      setErro(erroPayload.erro || 'Link inválido ou expirado.');
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
        <h1 className={styles.title}>Redefinir Senha</h1>
        <p className={styles.subtitle}>Digite a sua nova senha</p>

        {mensagem && (
          <div style={{ color: '#2e7d32', marginBottom: '1rem', fontSize: '0.85rem' }}>{mensagem}</div>
        )}
        {erro && <div style={{ color: '#c62828', marginBottom: '1rem', fontSize: '0.85rem' }}>{erro}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="NOVA SENHA"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
          />

          <Button type="submit" isLoading={carregando} style={{ marginTop: '1rem', width: '100%' }}>
            SALVAR NOVA SENHA
          </Button>

          <Link href="/login" className={styles.forgotLink}>
            Voltar ao Login
          </Link>
        </form>
      </div>
    </main>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div>A carregar formulário...</div>}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}