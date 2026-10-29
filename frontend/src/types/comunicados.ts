export interface ComunicadoRecebido {
  idComunicado: number;
  lido: boolean;
  tituloComunicado: string;
  mensagem: string;
  dataEnvio: string;
  remetente: {
    id: number;
    nome: string;
  };
}

export interface ComunicadoEnviado {
  id: number;
  idUsuarioRemetente: number;
  tituloComunicado: string;
  mensagem: string;
  dataEnvio: string;
  quantidadeDestinatarios: number;
  quantidadeLidos: number;
}

export interface ComunicadoDetalhado {
  id: number;
  idUsuarioRemetente: number;
  tituloComunicado: string;
  mensagem: string;
  dataEnvio: string;
  remetente: {
    id: number;
    nome: string;
  };
  quantidadeDestinatarios?: number;
  quantidadeLidos?: number;
  lido?: boolean;
}

export interface EnviarComunicadoPayload {
  tituloComunicado: string;
  mensagem: string;
  idTurma?: number;
}

export interface ContagemNaoLidosResponse {
  naoLidos: number;
}
