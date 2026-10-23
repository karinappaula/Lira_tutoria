'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, Send, Trash2, RotateCcw } from 'lucide-react';
import styles from './page.module.scss';
import Header from '@/components/layout/Header/Header';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import Spinner from '@/components/ui/Spinner/Spinner';
import ErrorState from '@/components/ui/ErrorState/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import {
  buscarRedacaoPorIdApi,
  autosaveRascunhoApi,
  enviarRedacaoApi,
  excluirRascunhoApi,
  criarReescritaApi,
} from '@/services/redacoes';
import { Redacao, VersaoRedacao, ErroAPI } from '@/types/api';

export default function EditorRedacaoPage() {
  const { id } = useParams();
  const idRedacao = Number(id);

  const { usuario, logout } = useAuth();
  const router = useRouter();

  const [redacao, setRedacao] = useState<Redacao | null>(null);
  const [versaoAtual, setVersaoAtual] = useState<VersaoRedacao | null>(null);
  const [texto, setTexto] = useState('');
  
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    carregarRedacao();
  }, [idRedacao]);

  async function carregarRedacao() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarRedacaoPorIdApi(idRedacao);
      setRedacao(dados);
      if (dados.versoes && dados.versoes.length > 0) {
        const ultima = dados.versoes[dados.versoes.length - 1];
        setVersaoAtual(ultima);
        setTexto(ultima.conteudoTexto || '');
      }
    } catch {
      setErro('Erro ao carregar detalhes da redação.');
    } finally {
      setCarregando(false);
    }
  }

  // Autosave com debounce a cada pausa na digitação
  function handleTextoChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const novoTexto = e.target.value;
    setTexto(novoTexto);

    if (versaoAtual?.statusVersao !== 'RASCUNHO') return;

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(async () => {
      setSalvando(true);
      try {
        await autosaveRascunhoApi(idRedacao, novoTexto);
      } catch {
        // Falha silenciosa no autosave
      } finally {
        setSalvando(false);
      }
    }, 1500);
  }

  async function handleEnviar() {
    if (!confirm('Deseja enviar sua redação para correção? O texto não poderá mais ser editado.')) return;
    setEnviando(true);
    setErro(null);
    try {
      await enviarRedacaoApi(idRedacao);
      setMensagemSucesso('Redação enviada com sucesso!');
      await carregarRedacao();
    } catch (err) {
      const erroPayload = err as ErroAPI;
      setErro(erroPayload.erro || 'Falha ao enviar a redação.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleSolicitarReescrita() {
    try {
      await criarReescritaApi(idRedacao);
      await carregarRedacao();
    } catch (err) {
      const erroPayload = err as ErroAPI;
      setErro(erroPayload.erro || 'Falha ao iniciar reescrita.');
    }
  }

  async function handleExcluir() {
    if (!confirm('Tem certeza que deseja excluir este rascunho?')) return;
    try {
      await excluirRascunhoApi(idRedacao);
      router.push('/aluno/redacoes');
    } catch (err) {
      const erroPayload = err as ErroAPI;
      setErro(erroPayload.erro || 'Falha ao excluir rascunho.');
    }
  }

  const palavrasCount = texto.trim() ? texto.trim().split(/\s+/).length : 0;
  const caracteresCount = texto.length;

  if (carregando) return <Spinner size="large" />;
  if (erro) return <ErrorState message={erro} onRetry={carregarRedacao} />;

  const eRascunho = versaoAtual?.statusVersao === 'RASCUNHO';
  const eCorrigida = versaoAtual?.statusVersao === 'CORRIGIDA';
  const eReescritaSolicitada = versaoAtual?.statusVersao === 'AGUARDANDO_REESCRITA';

  return (
    <>
      <Header nomeUsuario={usuario?.nome || 'Aluno'} papel="Aluno" turmaNome="3º A" onLogout={logout} />

      <main className={styles.container}>
        <div className={styles.headerCard}>
          <div>
            <h1>{redacao?.tema?.tituloTema || redacao?.tarefa?.tituloTarefa || 'Redação'}</h1>
            <span style={{ fontSize: '0.85rem', color: '#5a6b68' }}>
              Versão {versaoAtual?.numeroVersao || 1} • {redacao?.tipoFluxo}
            </span>
          </div>

          <div className={styles.statusArea}>
            {salvando && (
              <span style={{ fontSize: '0.8rem', color: '#005e5d', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Save size={14} /> Salvando...
              </span>
            )}
            <Badge variant={eRascunho ? 'neutral' : 'success'}>
              {versaoAtual?.statusVersao}
            </Badge>
          </div>
        </div>

        {mensagemSucesso && (
          <div style={{ padding: '0.85rem', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '8px' }}>
            {mensagemSucesso}
          </div>
        )}

        <div className={styles.editorGrid}>
          <div className={styles.editorArea}>
            <textarea
              className={styles.textarea}
              placeholder="Digite sua redação aqui..."
              value={texto}
              onChange={handleTextoChange}
              disabled={!eRascunho}
            />

            <div className={styles.counterBar}>
              <span>{palavrasCount} palavras | {caracteresCount} caracteres</span>
              
              {eRascunho && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="danger" onClick={handleExcluir}>
                    <Trash2 size={16} /> Excluir
                  </Button>
                  <Button onClick={handleEnviar} isLoading={enviando}>
                    <Send size={16} /> Enviar Redação
                  </Button>
                </div>
              )}

              {eReescritaSolicitada && (
                <Button onClick={handleSolicitarReescrita}>
                  <RotateCcw size={16} /> Iniciar V2 (Reescrita)
                </Button>
              )}
            </div>
          </div>

          <div className={styles.sidebar}>
            <div className={styles.infoCard}>
              <h3>Texto Motivador / Instruções</h3>
              <p>
                {redacao?.tema?.textoMotivador ||
                  redacao?.tarefa?.descricao ||
                  'Nenhum texto motivador fornecido.'}
              </p>
            </div>

            {eCorrigida && (
              <div className={styles.infoCard}>
                <h3>Resultado da Correção</h3>
                <p><strong>Status:</strong> Aprovada e Liberada</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}