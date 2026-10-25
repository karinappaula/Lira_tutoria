'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button } from '@/components/ui/Button/Button';
import { Card } from '@/components/ui/Card/Card';
import { Input, Select, Textarea } from '@/components/ui/Campos/Campos';
import { EmptyState, ErrorState } from '@/components/ui/Estados/Estados';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Tabela, type Coluna } from '@/components/ui/Tabela/Tabela';
import { useToast } from '@/components/ui/Toast/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { mascararCep, mascararCpf, mascararTelefone } from '@/lib/masks';
import styles from './vitrine.module.scss';

interface Linha {
  id: number;
  aluno: string;
  turma: string;
  nota: number;
}

const DADOS: Linha[] = [
  { id: 1, aluno: 'Aluno Exemplo', turma: '3ºA', nota: 920 },
  { id: 2, aluno: 'Outro Aluno', turma: '3ºA', nota: 640 },
];

const COLUNAS: Coluna<Linha>[] = [
  { chave: 'aluno', titulo: 'Aluno', celula: (l) => <strong>{l.aluno}</strong> },
  { chave: 'turma', titulo: 'Turma', celula: (l) => l.turma },
  { chave: 'nota', titulo: 'Nota final', alinhamento: 'centro', celula: (l) => `${l.nota}/1000` },
  {
    chave: 'status',
    titulo: 'Status',
    celula: (l) => (l.nota >= 800 ? <Badge tom="sucesso">Aprovada</Badge> : <Badge tom="alerta">Aguardando revisão</Badge>),
  },
];

export function Vitrine() {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');

  return (
    <div className={styles.pagina}>
      <PageHeader
        titulo="Vitrine de componentes"
        descricao="Página de desenvolvimento (não existe em produção)."
        acao={<Button icone={<Plus size={18} aria-hidden="true" />}>Nova tarefa</Button>}
      />

      <div className={styles.grade}>
        <Card titulo="Botões">
          <div className={styles.linha}>
            <Button>Primário</Button>
            <Button variante="secundario">Secundário</Button>
            <Button variante="escuro">Escuro</Button>
            <Button variante="perigo">Remover</Button>
            <Button variante="texto">Detalhes</Button>
            <Button carregando>Salvando</Button>
            <Button disabled>Desabilitado</Button>
          </div>
        </Card>

        <Card titulo="Selos e avisos">
          <div className={styles.linha}>
            <Badge>Rascunho</Badge>
            <Badge tom="sucesso">Corrigida</Badge>
            <Badge tom="alerta">Em revisão final</Badge>
            <Badge tom="perigo">Prazo encerrado</Badge>
            <Spinner />
          </div>
          <div className={styles.coluna}>
            <Alerta tom="info">Informação neutra para o usuário.</Alerta>
            <Alerta tom="erro">Algo deu errado ao salvar.</Alerta>
          </div>
        </Card>

        <Card titulo="Campos">
          <div className={styles.coluna}>
            <Input rotulo="E-mail" type="email" placeholder="seu.email@escola.com" dica="Use o e-mail da escola." />
            <Input rotulo="Senha" type="password" erro="A senha precisa ter pelo menos 8 caracteres." defaultValue="123" />
            <Select rotulo="Vestibular" defaultValue="">
              <option value="">Todos os vestibulares</option>
              <option value="ENEM">ENEM</option>
              <option value="FUVEST">FUVEST</option>
              <option value="UNICAMP">UNICAMP</option>
            </Select>
            <Textarea rotulo="Parecer geral" placeholder="Escreva aqui..." />
          </div>
        </Card>

        <Card titulo="Máscaras (utilitários prontos)">
          <div className={styles.coluna}>
            <Input rotulo="CPF" value={cpf} onChange={(e) => setCpf(mascararCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
            <Input rotulo="Telefone" value={telefone} onChange={(e) => setTelefone(mascararTelefone(e.target.value))} placeholder="(11) 90000-0000" inputMode="tel" />
            <Input rotulo="CEP" value={cep} onChange={(e) => setCep(mascararCep(e.target.value))} placeholder="00000-000" inputMode="numeric" />
          </div>
        </Card>
      </div>

      <h2 className={styles.secao}>Tabela</h2>
      <Tabela colunas={COLUNAS} linhas={DADOS} chaveDaLinha={(l) => l.id} descricao="Exemplo de tabela" />

      <h2 className={styles.secao}>Estados da tela</h2>
      <div className={styles.grade}>
        <Card>
          <EmptyState titulo="Nenhuma redação ainda" descricao="Quando você criar sua primeira redação, ela aparece aqui." acao={<Button>+ Nova redação</Button>} />
        </Card>
        <Card>
          <ErrorState mensagem="Não foi possível conectar ao servidor." conexao aoTentarNovamente={() => toast.info('Tentando novamente...')} />
        </Card>
      </div>

      <h2 className={styles.secao}>Avisos temporários e janela</h2>
      <div className={styles.linha}>
        <Button onClick={() => toast.sucesso('Tarefa criada com sucesso.')}>Toast de sucesso</Button>
        <Button variante="secundario" onClick={() => toast.erro('Não foi possível salvar. Tente novamente.')}>
          Toast de erro
        </Button>
        <Button variante="secundario" onClick={() => toast.info('Seu rascunho foi salvo.')}>
          Toast de informação
        </Button>
        <Button variante="escuro" onClick={() => setModal(true)}>
          Abrir janela
        </Button>
      </div>

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo="Remover tarefa?"
        rodape={
          <>
            <Button variante="secundario" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button
              variante="perigo"
              onClick={() => {
                setModal(false);
                toast.sucesso('Tarefa removida.');
              }}
            >
              Remover
            </Button>
          </>
        }
      >
        <p>Esta ação não pode ser desfeita.</p>
      </Modal>
    </div>
  );
}
