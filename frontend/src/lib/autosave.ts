/**
 * Controlador do salvamento automático do editor de redação (sem React, para ser testável).
 *
 * Regras:
 *  - salva 1,5 s depois da última digitação;
 *  - nunca faz duas gravações ao mesmo tempo, e sempre grava o texto mais recente;
 *  - se falhar (queda de conexão), tenta de novo com espera crescente (3 s, 6 s, 12 s, 30 s...);
 *  - se o servidor disser que a versão foi bloqueada (409), para de tentar;
 *  - cada alteração fica guardada no sessionStorage até o servidor confirmar.
 */

export type EstadoAutosave = 'salvo' | 'pendente' | 'salvando' | 'erro' | 'bloqueado';

export interface OpcoesAutosave {
  salvar: (texto: string) => Promise<void>;
  aoMudar: (estado: EstadoAutosave, salvoEm: Date | null) => void;
  /** true se o erro significa "versão bloqueada": não adianta tentar de novo */
  ehBloqueio: (erro: unknown) => boolean;
  guardarBackup?: (texto: string | null) => void;
  atrasoMs?: number;
  esperasDeNovaTentativaMs?: number[];
  agendar?: (fn: () => void, ms: number) => unknown;
  cancelar?: (id: unknown) => void;
}

const ESPERAS_PADRAO = [3000, 6000, 12000, 30000];

export class AutosaveController {
  private textoAtual: string;
  private ultimoSalvo: string;
  private estado: EstadoAutosave = 'salvo';
  private salvoEm: Date | null = null;
  private timer: unknown = null;
  private emAndamento: Promise<void> | null = null;
  private falhas = 0;
  private encerrado = false;
  private readonly op: Required<Omit<OpcoesAutosave, 'guardarBackup'>> & Pick<OpcoesAutosave, 'guardarBackup'>;

  constructor(textoDoServidor: string, opcoes: OpcoesAutosave, textoRecuperado?: string) {
    this.op = {
      atrasoMs: 1500,
      esperasDeNovaTentativaMs: ESPERAS_PADRAO,
      agendar: (fn, ms) => setTimeout(fn, ms),
      cancelar: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
      ...opcoes,
    };
    this.ultimoSalvo = textoDoServidor;
    this.textoAtual = textoDoServidor;
    // Havia uma cópia local mais nova que o servidor (a última gravação não chegou a terminar)
    if (textoRecuperado !== undefined && textoRecuperado !== textoDoServidor) {
      this.textoAtual = textoRecuperado;
      this.mudar('pendente');
      this.agendarGravacao(this.op.atrasoMs);
    }
  }

  get texto(): string {
    return this.textoAtual;
  }

  alterar(texto: string): void {
    if (this.encerrado || this.estado === 'bloqueado') return;
    this.textoAtual = texto;
    if (texto === this.ultimoSalvo && !this.emAndamento) {
      this.limparTimer();
      this.op.guardarBackup?.(null);
      this.mudar('salvo');
      return;
    }
    this.op.guardarBackup?.(texto);
    this.falhas = 0;
    this.mudar('pendente');
    this.agendarGravacao(this.op.atrasoMs);
  }

  /** Grava agora. Devolve true se o texto atual está salvo no servidor. */
  async salvarAgora(): Promise<boolean> {
    if (this.encerrado) return false;
    this.limparTimer();
    for (let i = 0; i < 3; i += 1) {
      if (this.emAndamento) await this.emAndamento;
      if (this.situacao() === 'bloqueado') return false;
      if (this.textoAtual === this.ultimoSalvo) return true;
      await this.gravar();
      const depois = this.situacao();
      if (depois === 'erro' || depois === 'bloqueado') return false;
    }
    return this.textoAtual === this.ultimoSalvo;
  }

  /** Para tudo (ao enviar, excluir ou sair da tela). */
  encerrar(limparBackup: boolean): void {
    this.encerrado = true;
    this.limparTimer();
    if (limparBackup) this.op.guardarBackup?.(null);
  }

  /** Lê o estado atual (evita o TypeScript considerar o valor antigo depois de um await). */
  private situacao(): EstadoAutosave {
    return this.estado;
  }

  private mudar(estado: EstadoAutosave): void {
    this.estado = estado;
    this.op.aoMudar(estado, this.salvoEm);
  }

  private limparTimer(): void {
    if (this.timer !== null) {
      this.op.cancelar(this.timer);
      this.timer = null;
    }
  }

  private agendarGravacao(ms: number): void {
    this.limparTimer();
    this.timer = this.op.agendar(() => {
      this.timer = null;
      void this.gravar();
    }, ms);
  }

  private gravar(): Promise<void> {
    if (this.emAndamento) return this.emAndamento;
    this.emAndamento = this.executar().finally(() => {
      this.emAndamento = null;
    });
    return this.emAndamento;
  }

  private async executar(): Promise<void> {
    if (this.encerrado) return;
    const enviado = this.textoAtual;
    this.mudar('salvando');
    try {
      await this.op.salvar(enviado);
    } catch (erro) {
      if (this.op.ehBloqueio(erro)) {
        this.mudar('bloqueado');
        return;
      }
      this.falhas += 1;
      this.mudar('erro');
      const esperas = this.op.esperasDeNovaTentativaMs;
      const espera = esperas[Math.min(this.falhas - 1, esperas.length - 1)] ?? 30000;
      this.agendarGravacao(espera);
      return;
    }
    this.ultimoSalvo = enviado;
    this.falhas = 0;
    this.salvoEm = new Date();
    if (this.textoAtual !== enviado) {
      // o aluno continuou digitando durante a gravação
      this.mudar('pendente');
      this.agendarGravacao(this.op.atrasoMs);
    } else {
      this.op.guardarBackup?.(null);
      this.mudar('salvo');
    }
  }
}

const PREFIXO_BACKUP = 'lira:rascunho:';

/** Cópia local do texto, apagada ao fechar a aba (sessionStorage), por causa dos computadores compartilhados. */
export function lerBackup(idRedacao: number): string | undefined {
  try {
    return window.sessionStorage.getItem(`${PREFIXO_BACKUP}${idRedacao}`) ?? undefined;
  } catch {
    return undefined;
  }
}

export function gravarBackup(idRedacao: number, texto: string | null): void {
  try {
    const chave = `${PREFIXO_BACKUP}${idRedacao}`;
    if (texto === null) window.sessionStorage.removeItem(chave);
    else window.sessionStorage.setItem(chave, texto);
  } catch {
    /* armazenamento indisponível: segue sem cópia local */
  }
}

/** Chamado no "Sair": nenhuma cópia de redação fica no navegador depois que a pessoa sai. */
export function limparBackupsDeRascunho(): void {
  try {
    const apagar: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const chave = window.sessionStorage.key(i);
      if (chave?.startsWith(PREFIXO_BACKUP)) apagar.push(chave);
    }
    apagar.forEach((c) => window.sessionStorage.removeItem(c));
  } catch {
    /* ignora */
  }
}