'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import styles from './page.module.scss';

// Imports com caminhos relativos diretos para evitar falhas de alias
import Header from '../../../components/layout/Header/Header';
import Button from '../../../components/ui/Button/Button';
import Badge from '../../../components/ui/Badge/Badge';
import Spinner from '../../../components/ui/Spinner/Spinner';
import EmptyState from '../../../components/ui/EmptyState/EmptyState';
import ErrorState from '../../../components/ui/ErrorState/ErrorState';

import { useAuth } from '../../../contexts/AuthContext';
import { listarMinhasRedacoesApi } from '../../../services/redacoes';
import { Redacao } from '../../../types/api';

export default function MinhasRedacoesPage() {
  const { usuario, logout } = useAuth();
  const router = useRouter();

  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarRedacoes();
  }, []);

  async function carregarRedacoes() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarMinhasRedacoesApi();
      setRedacoes(dados);
    } catch {
      setErro('Não foi possível carregar suas redações.');
    } finally {
      setCarregando(false);
    }
  }

  function traduzirStatus(status?: string) {
    switch (status) {
      case 'RASCUNHO':
        return { texto: 'Rascunho', variant: 'neutral' as const };
      case 'ENVIADA':
        return { texto: 'Aguardando correção', variant: 'warning' as const };
      case 'EM_CORRECAO':
        return { texto: 'Em revisão final', variant: 'info' as const };
      case 'CORRIGIDA':
        return { texto: 'Corrigida', variant: 'success' as const };
      case 'AGUARDANDO_REESCRITA':
        return { texto: 'Reescrita solicitada', variant: 'warning' as const };
      default:
        return { texto: 'Rascunho', variant: 'neutral' as const };
    }
  }

  return (
    <>
      <Header
        nomeUsuario={usuario?.nome || 'Aluno'}
        papel="Aluno"
        turmaNome="3º A"
        onLogout={logout}
      />

      <main className={styles.container}>
        <div className={styles.topBar}>
          <div>
            <h1>Minhas redações</h1>
            <p>Acompanhe todos os seus textos submetidos, rascunhos e correções do corretor.</p>
          </div>
          <Button onClick={() => router.push('/aluno/redacoes/nova')}>
            <Plus size={18} /> Nova redação
          </Button>
        </div>

        {carregando && <Spinner size="large" />}

        {erro && <ErrorState message={erro} onRetry={carregarRedacoes} />}

        {!carregando && !erro && redacoes.length === 0 && (
          <EmptyState message="Você ainda não possui redações criadas." />
        )}

        {!carregando && !erro && redacoes.length > 0 && (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>REDAÇÃO</th>
                  <th>STATUS</th>
                  <th>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {redacoes.map((item) => {
                  const ultimaVersao = item.versoes?.[item.versoes.length - 1];
                  const statusInfo = traduzirStatus(ultimaVersao?.statusVersao);
                  const titulo =
                    item.tema?.tituloTema || item.tarefa?.tituloTarefa || 'Redação sem título';

                  return (
                    <tr key={item.id}>
                      <td className={styles.titleCol}>{titulo}</td>
                      <td>
                        <Badge variant={statusInfo.variant}>{statusInfo.texto}</Badge>
                      </td>
                      <td>
                        <Link
                          href={`/aluno/redacoes/${item.id}`}
                          className={styles.actionButton}
                        >
                          {ultimaVersao?.statusVersao === 'RASCUNHO' ? 'Continuar' : 'Ver'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}