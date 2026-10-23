'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Feather, Eye, EyeOff, AlertCircle } from 'lucide-react';
import styles from './page.module.scss';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import { loginApi } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ErroAPI } from '@/types/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const { salvarSessao } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const resposta = await loginApi(email, senha);

      if (resposta.tipo === 'sessao') {
        salvarSessao(resposta.token, resposta.usuario, resposta.papelAtivo);
      } else if (resposta.tipo === 'selecao_pendente') {
        sessionStorage.setItem('@lira:tokenPendente', resposta.token);
        sessionStorage.setItem('@lira:papeis', JSON.stringify(resposta.papeisDisponiveis));
        router.push('/selecionar-papel');
      }
    } catch (err) {
      const erroPayload = err as ErroAPI;
      setErro(erroPayload.erro || 'E-mail ou senha incorretos. Verifique suas credenciais.');
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
        <h1 className={styles.title}>Bem vindo!</h1>
        <p className={styles.subtitle}>Entre com sua conta para continuar</p>

        {erro && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textAlign: 'left',
            border: '1px solid #ef9a9a'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="EMAIL"
            type="email"
            placeholder="seu.email@escola.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (erro) setErro(null);
            }}
            required
          />

          <div className={styles.passwordWrapper}>
            <Input
              label="SENHA"
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="••••••••"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                if (erro) setErro(null);
              }}
              required
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setMostrarSenha(!mostrarSenha)}
            >
              {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Button type="submit" isLoading={carregando} style={{ marginTop: '0.5rem', width: '100%' }}>
            ENTRAR
          </Button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <Link href="/esqueci-senha" className={styles.forgotLink}>
              Esqueci minha Senha
            </Link>
            
            <Link href="/cadastro" className={styles.forgotLink} style={{ color: '#005e5d', fontWeight: 700 }}>
              Possui um código de convite? Cadastre-se
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}