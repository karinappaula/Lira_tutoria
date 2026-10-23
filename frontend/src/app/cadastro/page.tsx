'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Feather, AlertCircle } from 'lucide-react';
import styles from '../login/page.module.scss';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import { cadastrarApi } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ErroAPI } from '@/types/api';

function CadastroForm() {
  const searchParams = useSearchParams();
  const codigoUrl = searchParams.get('codigo') || '';

  const [codigo, setCodigo] = useState(codigoUrl);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const { salvarSessao } = useAuth();

  useEffect(() => {
    if (codigoUrl) setCodigo(codigoUrl);
  }, [codigoUrl]);

  const eTutor = codigo.toUpperCase().startsWith('TUT-');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const resposta = await cadastrarApi({ codigo, nome, email, senha });
      salvarSessao(resposta.token, resposta.usuario, resposta.papelAtivo);
    } catch (err) {
      const erroPayload = err as ErroAPI;
      setErro(erroPayload.erro || 'Falha ao efetuar o cadastro. Verifique o código digitado.');
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
        <h1 className={styles.title}>
          {eTutor ? 'CRIAR CONTA DE TUTOR' : 'CRIAR CONTA DE ALUNO'}
        </h1>
        <p className={styles.subtitle}>
          Você foi convidado para a plataforma Tutoria de Redações
        </p>

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
            label="CÓDIGO DE CONVITE"
            type="text"
            placeholder="Ex: TUT-ABC123 ou ALU-XYZ456"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />

          <Input
            label="NOME"
            type="text"
            placeholder="Seu nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

          <Input
            label="EMAIL"
            type="email"
            placeholder="seu.email@escola.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="SENHA"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <Button type="submit" isLoading={carregando} style={{ marginTop: '0.5rem', width: '100%' }}>
            CADASTRAR
          </Button>

          <Link href="/login" className={styles.forgotLink} style={{ marginTop: '1rem' }}>
            Já tem uma conta? Faça Login
          </Link>
        </form>
      </div>
    </main>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div>A carregar formulário...</div>}>
      <CadastroForm />
    </Suspense>
  );
}