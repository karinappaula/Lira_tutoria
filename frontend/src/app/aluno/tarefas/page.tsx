'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.scss';
import Header from '@/components/layout/Header/Header';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import Spinner from '@/components/ui/Spinner/Spinner';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import ErrorState from '@/components/ui/ErrorState/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { listarTarefasAlunoApi } from '@/services/tarefas';
import { Tarefa } from '@/types/api';

export default function TarefasAlunoPage() {
  const { usuario, logout } = useAuth();
  const router = useRouter();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarTarefas();
  }, []);

  async function carregarTarefas() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarTarefasAlunoApi();
      setTarefas(dados);
    } catch {
      setErro('Erro ao carregar lista de tarefas.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <Header nomeUsuario={usuario?.nome || 'Aluno'} papel="Aluno" turmaNome="3º A" onLogout={logout} />

      <main className={styles.container}>
        <div className={styles.header}>
          <h1>Minhas Tarefas</h1>
          <p>Confira as propostas passadas pelo seu tutor.</p>
        </div>

        {carregando && <Spinner size="large" />}
        {erro && <ErrorState message={erro} onRetry={carregarTarefas} />}

        {!carregando && !erro && tarefas.length === 0 && (
          <EmptyState message="Nenhuma tarefa atribuída à sua turma até o momento." />
        )}

        {!carregando && !erro && tarefas.length > 0 && (
          <div className={styles.grid}>
            {tarefas.map((tar) => {
              const expirado = new Date(tar.prazoEntrega) < new Date();
              return (
                <div key={tar.id} className={styles.cardTarefa}>
                  <div className={styles.info}>
                    <h3>{tar.tituloTarefa}</h3>
                    <p>{tar.descricao || 'Sem descrição.'}</p>
                    <span style={{ fontSize: '0.8rem', color: '#5a6b68' }}>
                      Prazo: {new Date(tar.prazoEntrega).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Badge variant={expirado ? 'error' : 'warning'}>
                      {expirado ? 'Prazo encerrado' : 'Pendente'}
                    </Badge>
                    <Button onClick={() => router.push('/aluno/redacoes/nova')}>
                      Escrever
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}