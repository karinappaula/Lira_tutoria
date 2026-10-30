'use client';

import { useEffect, useState } from 'react';
import { Copy, RefreshCw, UserPlus } from 'lucide-react';
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
  const [confirmarRenovar, setConfirmarRenovar] = useState(false);

  // espera o usuário parar de digitar antes de buscar
  useEffect(() => {
    const t = window.setTimeout(() => setTermo(busca.trim()), 400);
    return () => window.clearTimeout(t);
  }, [busca]);

  const { dados, carregando, erro, recarregar } = useBuscar((signal) => tutorService.tutorados(termo || undefined, signal), termo);
  const alunos = dados ?? [];

  async function obterOuGerarConvite(renovar = false) {
    setConvidando(true);
    setErroConvite(null);
    try {
      const conv = await tutorService.convidarAluno(renovar);
      setConvite(conv);
      if (renovar) {
        toast.sucesso('Novo link do grupo gerado com sucesso!');
        setConfirmarRenovar(false);
      }
    } catch (e) {
      setErroConvite(mensagemDeErro(e));
    } finally {
      setConvidando(false);
    }
  }

  // Executa a busca/geração do convite APENAS UMA VEZ na montagem do componente (matriz de dependências [])
  useEffect(() => {
    let ativo = true;

    async function carregarConviteInicial() {
      try {
        const conv = await tutorService.convidarAluno(false);
        if (ativo) {
          setConvite(conv);
        }
      } catch {
        // Silencioso se o tutor ainda não possui turma ativa ou atingiu o limite
      }
    }

    void carregarConviteInicial();

    return () => {
      ativo = false;
    };
  }, [dados]);

  function abrirModalConvite() {
    setErroConvite(null);
    setConfirmarRenovar(false);
    setConviteAberto(true);
    void obterOuGerarConvite(false);
  }

  const link = convite && typeof window !== 'undefined' ? `${window.location.origin}/cadastro?codigo=${encodeURIComponent(convite.codigo)}` : '';

  async function copiar(texto: string) {
    if (!texto) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
      } else {
        // Fallback seguro usando elemento textarea temporário
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copiado = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copiado) {
          throw new Error('Fallback de cópia falhou');
        }
      }
      toast.sucesso('Link copiado para a área de transferência!');
    } catch {
      toast.erro('Não foi possível copiar automaticamente. Selecione o texto e copie.');
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

  const totalVagas = convite?.usosMaximos ?? 10;
  const vagasOcupadas = convite?.usos !== undefined ? convite.usos : alunos.length;
  const vagasRestantes = Math.max(0, totalVagas - vagasOcupadas);
  const grupoLotado = vagasOcupadas >= totalVagas;

  return (
    <>
      <PageHeader
        titulo="Visão Geral da Turma"
        descricao="Acompanhe a lista de alunos vinculados e seu status atual."
        acao={
          <Button
            icone={<UserPlus size={18} aria-hidden="true" />}
            onClick={abrirModalConvite}
          >
            Convidar aluno
          </Button>
        }
      />
      <div className={styles.barraFerramentas}>
        <div className={styles.filtro}>
          <Input rotulo="Buscar aluno" ocultarRotulo type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno..." />
        </div>
        <div className={styles.contadores}>
          {!carregando && !erro && (
            <p className={styles.contagem}>
              {alunos.length} {alunos.length === 1 ? 'aluno cadastrado' : 'alunos cadastrados'}
            </p>
          )}
          <Badge tom={grupoLotado ? 'perigo' : 'sucesso'}>
            Vagas: {vagasOcupadas}/{totalVagas}
          </Badge>
        </div>
      </div>

      {carregando ? (
        <CarregandoPagina rotulo="Carregando seus alunos" />
      ) : erro ? (
        <ErrorState
          mensagem={erro.message}
          conexao={erro.ehErroDeConexao}
          aoTentarNovamente={() => {
            recarregar();
            void obterOuGerarConvite(false);
          }}
        />
      ) : alunos.length === 0 ? (
        <div className={styles.vazio}>
          <EmptyState titulo={termo ? 'Nenhum aluno encontrado' : 'Você ainda não tem alunos'} descricao={termo ? 'Tente outro nome.' : 'Use "Convidar aluno" para gerar um link de grupo para seus alunos.'} />
        </div>
      ) : (
        <Tabela colunas={colunas} linhas={alunos} chaveDaLinha={(a) => a.idAluno} descricao="Lista dos seus alunos" />
      )}

      <Modal
        aberto={conviteAberto}
        aoFechar={() => {
          setConviteAberto(false);
          setConfirmarRenovar(false);
        }}
        titulo="Link do Grupo Reutilizável"
        rodape={
          confirmarRenovar ? (
            <>
              <Button variante="secundario" onClick={() => setConfirmarRenovar(false)} disabled={convidando}>
                Voltar
              </Button>
              <Button variante="perigo" carregando={convidando} onClick={() => void obterOuGerarConvite(true)}>
                Confirmar renovação
              </Button>
            </>
          ) : (
            <>
              <Button
                variante="secundario"
                icone={<RefreshCw size={16} aria-hidden="true" />}
                onClick={() => setConfirmarRenovar(true)}
                disabled={convidando}
              >
                Renovar link
              </Button>
              <Button onClick={() => setConviteAberto(false)}>
                Concluir
              </Button>
            </>
          )
        }
      >
        <div className={styles.formulario}>
          {erroConvite && <Alerta tom="erro">{erroConvite}</Alerta>}

          {confirmarRenovar ? (
            <Alerta tom="alerta">
              <strong>Tem certeza que deseja renovar o link?</strong>
              <p>O link e código atuais serão desativados imediatamente. Novos alunos deverão utilizar o novo link gerado.</p>
            </Alerta>
          ) : convite ? (
            <>
              <div className={styles.infoVagas}>
                <span>Vagas no grupo: <strong>{vagasOcupadas}/{totalVagas}</strong></span>
                <Badge tom={grupoLotado ? 'perigo' : 'sucesso'}>
                  {grupoLotado ? 'Limite atingido (10/10)' : `${vagasRestantes} ${vagasRestantes === 1 ? 'vaga restante' : 'vagas restantes'}`}
                </Badge>
              </div>

              <div className={styles.codigo}>
                <strong>{convite.codigo}</strong>
                <span>Válido até {formatarDataHora(convite.expiraEm)}</span>
              </div>

              <p>Envie o link abaixo para seus alunos. Ele pode ser reutilizado por até {totalVagas} alunos para ingressar no seu grupo de tutoria.</p>
              
              <div className={styles.campoLink}>
                <Input
                  rotulo="Link de convite"
                  ocultarRotulo
                  readOnly
                  value={link}
                />
              </div>

              <div className={styles.acoesLink}>
                <Button
                  variante="primario"
                  icone={<Copy size={16} aria-hidden="true" />}
                  onClick={() => void copiar(link)}
                  disabled={grupoLotado}
                >
                  Copiar link do grupo
                </Button>
              </div>
            </>
          ) : convidando ? (
            <CarregandoPagina rotulo="Carregando link de convite..." />
          ) : (
            <p>Carregando informações do link do grupo...</p>
          )}
        </div>
      </Modal>
    </>
  );
}
