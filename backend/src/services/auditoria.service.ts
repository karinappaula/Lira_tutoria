import { prisma } from "../db/prisma";

// Aceita tanto o client normal quanto o "tx" de uma transação,
// para que o log seja gravado junto com a operação que ele registra.
type ClienteAuditoria = Pick<typeof prisma, "auditoria">;

export interface DadosAuditoria {
  idUsuario: number;
  acao: string;
  entidade: string;
  idRegistro?: number;
  descricao?: string;
}

export async function registrarAuditoria(
  dados: DadosAuditoria,
  cliente: ClienteAuditoria = prisma
): Promise<void> {
  await cliente.auditoria.create({
    data: {
      idUsuario: dados.idUsuario,
      acao: dados.acao,
      entidade: dados.entidade,
      idRegistro: dados.idRegistro,
      descricao: dados.descricao,
    },
  });
}
