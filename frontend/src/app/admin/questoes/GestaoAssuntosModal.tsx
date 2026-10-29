'use client';

import { useState } from 'react';
import { Check, Edit2, Plus, Tag, Trash2, X } from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Campos/Campos';
import { Modal } from '@/components/ui/Modal/Modal';
import { useToast } from '@/components/ui/Toast/Toast';
import { mensagemDeErro } from '@/lib/erros';
import { questoesService } from '@/services/questoes';
import type { Assunto } from '@/types/simulados';
import styles from './GestaoAssuntosModal.module.scss';

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  assuntos: Assunto[];
  aoAtualizar: () => void;
}

export function GestaoAssuntosModal({ aberto, aoFechar, assuntos, aoAtualizar }: Props) {
  const toast = useToast();
  const [novoNome, setNovoNome] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Edição inline
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [nomeEditando, setNomeEditando] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Exclusão
  const [idExcluindo, setIdExcluindo] = useState<number | null>(null);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo) return;

    setSalvandoNovo(true);
    setErro(null);
    try {
      await questoesService.criarAssunto(nomeLimpo);
      setNovoNome('');
      toast.sucesso('Assunto cadastrado com sucesso!');
      aoAtualizar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setSalvandoNovo(false);
    }
  }

  function iniciarEdicao(assunto: Assunto) {
    setIdEditando(assunto.id);
    setNomeEditando(assunto.nomeAssunto);
    setErro(null);
  }

  function cancelarEdicao() {
    setIdEditando(null);
    setNomeEditando('');
  }

  async function handleSalvarEdicao(idAssunto: number) {
    const nomeLimpo = nomeEditando.trim();
    if (!nomeLimpo) return;

    setSalvandoEdicao(true);
    setErro(null);
    try {
      await questoesService.atualizarAssunto(idAssunto, nomeLimpo);
      cancelarEdicao();
      toast.sucesso('Assunto atualizado com sucesso!');
      aoAtualizar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function handleExcluir(assunto: Assunto) {
    const qtd = assunto._count?.questoes ?? 0;
    const confirmacao = window.confirm(
      qtd > 0
        ? `Atenção: O assunto "${assunto.nomeAssunto}" está associado a ${qtd} questão(ões). Deseja realmente excluí-lo?`
        : `Deseja realmente excluir o assunto "${assunto.nomeAssunto}"?`,
    );
    if (!confirmacao) return;

    setIdExcluindo(assunto.id);
    setErro(null);
    try {
      await questoesService.excluirAssunto(assunto.id);
      toast.sucesso('Assunto removido!');
      aoAtualizar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setIdExcluindo(null);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Gestão de Assuntos e Taxonomia"
      tamanho="lg"
      rodape={
        <Button variante="secundario" onClick={aoFechar}>
          Fechar
        </Button>
      }
    >
      <div>
        {erro && (
          <div style={{ marginBottom: '16px' }}>
            <Alerta tom="erro">{erro}</Alerta>
          </div>
        )}

        <form onSubmit={handleCriar} className={styles.formularioNovo}>
          <div className={styles.campoTexto}>
            <Input
              rotulo="Novo Assunto"
              placeholder="Ex.: Funções de 1º Grau, Genética, Modernismo..."
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              disabled={salvandoNovo}
            />
          </div>
          <Button
            type="submit"
            variante="primario"
            icone={<Plus size={16} aria-hidden="true" />}
            carregando={salvandoNovo}
            disabled={!novoNome.trim()}
          >
            Adicionar Assunto
          </Button>
        </form>

        <div className={styles.listaAssuntos}>
          {assuntos.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7d80', padding: '24px' }}>
              Nenhum assunto cadastrado ainda. Use o formulário acima para criar o primeiro.
            </p>
          ) : (
            assuntos.map((assunto) => {
              const estaEditando = idEditando === assunto.id;
              const estaExcluindo = idExcluindo === assunto.id;

              return (
                <div key={assunto.id} className={styles.itemAssunto}>
                  {estaEditando ? (
                    <div className={styles.edicaoAtiva}>
                      <Input
                        rotulo="Nome do Assunto"
                        ocultarRotulo
                        value={nomeEditando}
                        onChange={(e) => setNomeEditando(e.target.value)}
                        disabled={salvandoEdicao}
                        autoFocus
                      />
                      <Button
                        tamanho="sm"
                        variante="primario"
                        icone={<Check size={14} aria-hidden="true" />}
                        carregando={salvandoEdicao}
                        onClick={() => void handleSalvarEdicao(assunto.id)}
                      >
                        Salvar
                      </Button>
                      <Button
                        tamanho="sm"
                        variante="secundario"
                        icone={<X size={14} aria-hidden="true" />}
                        disabled={salvandoEdicao}
                        onClick={cancelarEdicao}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className={styles.infoAssunto}>
                        <Tag size={18} color="#006b70" aria-hidden="true" />
                        <span className={styles.nomeAssunto}>{assunto.nomeAssunto}</span>
                        <span className={styles.contadorQuestoes}>
                          {assunto._count?.questoes ?? 0} {assunto._count?.questoes === 1 ? 'questão' : 'questões'}
                        </span>
                      </div>
                      <div className={styles.acoesAssunto}>
                        <Button
                          tamanho="sm"
                          variante="secundario"
                          icone={<Edit2 size={14} aria-hidden="true" />}
                          onClick={() => iniciarEdicao(assunto)}
                        >
                          Editar
                        </Button>
                        <Button
                          tamanho="sm"
                          variante="perigo"
                          icone={<Trash2 size={14} aria-hidden="true" />}
                          carregando={estaExcluindo}
                          onClick={() => void handleExcluir(assunto)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
