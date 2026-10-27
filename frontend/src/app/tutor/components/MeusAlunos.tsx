'use client';

import { useEffect, useState } from 'react';
import { Copy, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge, type TomDoBadge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { CarregandoPagina } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { useBuscar } from '@/hooks/useBuscar';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/formatar';
import { tutorService } from '@/services/tutor';
import type { ConviteCriado, Tutorado } from '@/types/correcoes';
import styles from './Tutor.module.scss';

function tomDoAproveitamento(valor: number): TomDoBadge {
  if (valor >= 70) return 'sucesso';
  if (valor >= 40) return 'alerta';
  return 'perigo';
}

export function MeusAlunos() {
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');
  const [convite, setConvite] = useState<ConviteCriado | null>(null);
  const [conviteAberto, setConviteAberto] = useState(false);
  const [convidando, setConvidando] = useState(false);
  const [erroConvite, setErroConvite] = useState<string | null>(null);

  // espera o usuário parar de digitar antes de buscar
  useEffect(() => {
    const t = window.setTimeout(() => setTermo(busca.trim()), 400);
    return () => window.clearTimeout(t);
  }, [busca]);

  const { dados, carregando, erro, recarregar } = useBuscar((signal) => tutorService.tutorados(termo || undefined, signal), termo);
  const alunos = dados ?? [];

  async function gerarConvite() {
    setConvidando(true);
    setErroConvite(null);
    try {
      setConvite(await tutorService.convidarAluno());
    } catch (e) {
      setErroConvite(mensagemDeErro(e));
    } finally {
      setConvidando(false);
    }
  }

  const link = convite && typeof window !== 'undefined' ? `${window.location.origin}/cadastro?codigo=${encodeURIComponent(convite.codigo)}` : '';

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.sucesso('Copiado!');
    } catch {
      toast.erro('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }

  const colunas: Coluna<Tutorado>[] = [
    { chave: 'aluno', titulo: 'Aluno', celula: (a) => <strong>{a.nome}</strong> },
    { chave: 'turma', titulo: 'Turma', celula: (a) => a.turma?.nome ?? '—' },
    { chave: 'enviadas', titulo: 'Redações enviadas', alinhamento: 'centro', celula: (a) => a.redacoesEnviadas },
    {
      chave: 'aproveitamento',
      titulo: 'Aproveitamento',
      alinhamento: 'centro',
      celula: (a) => (a.aproveitamento === null ? '—' : <Badge tom={tomDoAproveitamento(a.aproveitamento)}>{`${a.aproveitamento}%`}</Badge>),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Visão Geral da Turma"
        descricao="Acompanhe a lista de alunos vinculados e seu status atual."
        acao={
          <Button
            icone={<UserPlus size={18} aria-hidden="true" />}
            onClick={() => {
              setConvite(null);
              setErroConvite(null);
              setConvidando(false);
              setConviteAberto(true);
            }}
          >
            Convidar aluno
          </Button>
        }
      />
      <div className={styles.barraFerramentas}>
        <div className={styles.filtro}>
          <Input rotulo="Buscar aluno" ocultarRotulo type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno..." />
        </div>
        {!carregando && !erro && <p className={styles.contagem}>{alunos.length} {alunos.length === 1 ? 'aluno cadastrado' : 'alunos cadastrados'}</p>}
      </div>

      {carregando ? (
        <CarregandoPagina rotulo="Carregando seus alunos" />
      ) : erro ? (
        <ErrorState mensagem={erro.message} conexao={erro.ehErroDeConexao} aoTentarNovamente={recarregar} />
      ) : alunos.length === 0 ? (
        <div className={styles.vazio}>
          <EmptyState titulo={termo ? 'Nenhum aluno encontrado' : 'Você ainda não tem alunos'} descricao={termo ? 'Tente outro nome.' : 'Use "Convidar aluno" para gerar um código de cadastro.'} />
        </div>
      ) : (
        <Tabela colunas={colunas} linhas={alunos} chaveDaLinha={(a) => a.idAluno} descricao="Lista dos seus alunos" />
      )}

      <Modal
        aberto={conviteAberto}
        aoFechar={() => setConviteAberto(false)}
        titulo="Convidar aluno"
        rodape={
          convite ? (
            <Button onClick={() => setConviteAberto(false)}>Concluir</Button>
          ) : (
            <>
              <Button variante="secundario" onClick={() => setConviteAberto(false)} disabled={convidando}>
                Cancelar
              </Button>
              <Button carregando={convidando} onClick={() => void gerarConvite()}>
                Gerar convite
              </Button>
            </>
          )
        }
      >
        <div className={styles.formulario}>
          {erroConvite && <Alerta tom="erro">{erroConvite}</Alerta>}
          {convite ? (
            <>
              <div className={styles.codigo}>
                <strong>{convite.codigo}</strong>
                <span>Válido até {formatarDataHora(convite.expiraEm)}</span>
              </div>
              <p>Envie o link abaixo para o aluno. Ele abre o cadastro já com o código preenchido.</p>
              <p className={styles.linkConvite}>{link}</p>
              <Button variante="secundario" icone={<Copy size={16} aria-hidden="true" />} onClick={() => void copiar(link)}>
                Copiar link
              </Button>
            </>
          ) : (
            <p>Será gerado um código de uso único, válido por 30 dias, para o aluno criar a conta e ficar vinculado a você.</p>
          )}
        </div>
      </Modal>
    </>
  );
}