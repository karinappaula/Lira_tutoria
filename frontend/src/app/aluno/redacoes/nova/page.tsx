'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.scss';
import Header from '@/components/layout/Header/Header';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import { useAuth } from '@/contexts/AuthContext';
import { listarTemasApi } from '@/services/temas';
import { listarTarefasAlunoApi } from '@/services/tarefas';
import { criarRedacaoTreinoApi, criarRedacaoAvaliativaApi } from '@/services/redacoes';
import { Tema, Tarefa, ErroAPI } from '@/types/api';

export default function NovaRedacaoPage() {
  const { usuario, logout } = useAuth();
  const router = useRouter();

  const [tipoFluxo, setTipoFluxo] = useState<'TREINO' | 'AVALIATIVA'>('TREINO');
  const [temas, setTemas] = useState<Tema[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  
  const [idTemaSelecionado, setIdTemaSelecionado] = useState<string>('');
  const [temaProprio, setTemaProprio] = useState<string>('');
  const [idTarefaSelecionada, setIdTarefaSelecionada] = useState<string>('');
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarOpcoes() {
      try {
        const [temasData, tarefasData] = await Promise.all([
          listarTemasApi(),
          listarTarefasAlunoApi(),
        ]);
        setTemas(temasData);
        setTarefas(tarefasData.filter((t) => t.modalidade === 'AVALIATIVA'));
      } catch {
        setErro('Erro ao carregar opções de temas/tarefas.');
      }
    }
    carregarOpcoes();
  }, []);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      let novaRedacao;
      if (tipoFluxo === 'TREINO') {
        novaRedacao = await criarRedacaoTreinoApi({
          idTema: idTemaSelecionado ? Number(idTemaSelecionado) : undefined,
          temaProprio: !idTemaSelecionado && temaProprio ? temaProprio : undefined,
        });
      } else {
        novaRedacao = await criarRedacaoAvaliativaApi({
          idTarefa: Number(idTarefaSelecionada),
        });
      }

      router.push(`/aluno/redacoes/${novaRedacao.id}`);
    } catch (err) {
      const erroPayload = err as ErroAPI;
      setErro(erroPayload.erro || 'Não foi possível criar a redação.');
    } finally {
      setCarregando(false);
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
        <div className={styles.card}>
          <h1>Nova Redação</h1>

          {erro && <div style={{ color: '#c62828', fontSize: '0.9rem' }}>{erro}</div>}

          <div className={styles.typeSelector}>
            <button
              type="button"
              className={tipoFluxo === 'TREINO' ? styles.active : ''}
              onClick={() => setTipoFluxo('TREINO')}
            >
              Treino Livre
            </button>
            <button
              type="button"
              className={tipoFluxo === 'AVALIATIVA' ? styles.active : ''}
              onClick={() => setTipoFluxo('AVALIATIVA')}
            >
              Tarefa Avaliativa
            </button>
          </div>

          <form onSubmit={handleCriar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {tipoFluxo === 'TREINO' ? (
              <>
                <div className={styles.formGroup}>
                  <label>Escolher Tema Existente</label>
                  <select
                    value={idTemaSelecionado}
                    onChange={(e) => {
                      setIdTemaSelecionado(e.target.value);
                      if (e.target.value) setTemaProprio('');
                    }}
                  >
                    <option value="">-- Selecione um tema oficial ou do tutor --</option>
                    {temas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tituloTema}
                      </option>
                    ))}
                  </select>
                </div>

                {!idTemaSelecionado && (
                  <Input
                    label="OU DIGITE UM TEMA PRÓPRIO"
                    placeholder="Ex: Os desafios da preservação ambiental"
                    value={temaProprio}
                    onChange={(e) => setTemaProprio(e.target.value)}
                  />
                )}
              </>
            ) : (
              <div className={styles.formGroup}>
                <label>Selecionar Tarefa do Tutor</label>
                <select
                  value={idTarefaSelecionada}
                  onChange={(e) => setIdTarefaSelecionada(e.target.value)}
                  required
                >
                  <option value="">-- Selecione uma tarefa pendente --</option>
                  {tarefas.map((tar) => (
                    <option key={tar.id} value={tar.id}>
                      {tar.tituloTarefa} (Prazo: {new Date(tar.prazoEntrega).toLocaleDateString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button type="submit" isLoading={carregando} style={{ marginTop: '1rem' }}>
              Iniciar Escrita
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}