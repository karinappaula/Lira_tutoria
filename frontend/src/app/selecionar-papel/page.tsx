'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, ArrowRight } from 'lucide-react';
import styles from './page.module.scss';
import Button from '@/components/ui/Button/Button';
import { selecionarPapelApi } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import { PapelUsuario, ErroAPI } from '@/types/api';

export default function SelecionarPapelPage() {
  const [tokenPendente, setTokenPendente] = useState<string | null>(null);
  const [papeis, setPapeis] = useState<PapelUsuario[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { salvarSessao } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem('@lira:tokenPendente');
    const papeisSalvos = sessionStorage.getItem('@lira:papeis');

    if (!token || !papeisSalvos) {
      router.push('/login');
      return;
    }

    setTokenPendente(token);
    setPapeis(JSON.parse(papeisSalvos));
  }, [router]);

  async function handleEscolherPapel(papel: PapelUsuario) {
    if (!tokenPendente) return;
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await selecionarPapelApi(tokenPendente, papel);
      sessionStorage.removeItem('@lira:tokenPendente');
      sessionStorage.removeItem('@lira:papeis');
      salvarSessao(resposta.token, resposta.usuario, resposta.papelAtivo);
    } catch (err) {
      const erroPayload = err as ErroAPI;
      setErro(erroPayload.erro || 'Falha ao selecionar papel.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1>Qual área deseja acessar?</h1>
        <p>Selecione Aluno ou Tutor para continuar.</p>
      </div>

      {erro && <div style={{ color: '#c62828', marginBottom: '1rem' }}>{erro}</div>}

      <div className={styles.grid}>
        {papeis.includes('ALUNO') && (
          <div className={styles.cardRole}>
            <div>
              <div className={styles.roleHeader}>
                <div className={styles.iconBg}>
                  <GraduationCap size={24} />
                </div>
                <h2>Aluno</h2>
              </div>
              <p style={{ marginTop: '0.75rem' }}>Acesse sua conta como um aluno.</p>
            </div>
            <Button
              isLoading={carregando}
              onClick={() => handleEscolherPapel('ALUNO')}
              style={{ width: '100%' }}
            >
              Entrar em Aluno <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {papeis.includes('TUTOR') && (
          <div className={styles.cardRole}>
            <div>
              <div className={styles.roleHeader}>
                <div className={styles.iconBg}>
                  <Users size={24} />
                </div>
                <h2>Tutor</h2>
              </div>
              <p style={{ marginTop: '0.75rem' }}>Acesse sua conta como um tutor.</p>
            </div>
            <Button
              isLoading={carregando}
              onClick={() => handleEscolherPapel('TUTOR')}
              style={{ width: '100%' }}
            >
              Entrar em Tutor <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}