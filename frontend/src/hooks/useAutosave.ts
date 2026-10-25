'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/erros';
import { AutosaveController, gravarBackup, lerBackup, type EstadoAutosave } from '@/lib/autosave';
import { redacoesService } from '@/services/redacoes';

/** Liga o AutosaveController ao React: texto, estado do salvamento e funções de controle. */
export function useAutosave(idRedacao: number, textoDoServidor: string) {
  const [estado, setEstado] = useState<EstadoAutosave>('salvo');
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);
  const controladorRef = useRef<AutosaveController | null>(null);
  const [texto, setTexto] = useState(textoDoServidor);

  useEffect(() => {
    const controlador = new AutosaveController(
      textoDoServidor,
      {
        salvar: async (t) => {
          await redacoesService.salvarRascunho(idRedacao, t);
        },
        aoMudar: (e, quando) => {
          setEstado(e);
          setSalvoEm(quando);
        },
        ehBloqueio: (erro) => erro instanceof ApiError && erro.status === 409,
        guardarBackup: (t) => gravarBackup(idRedacao, t),
      },
      lerBackup(idRedacao),
    );
    controladorRef.current = controlador;
    setTexto(controlador.texto);

    // Voltou a conexão: tenta salvar na hora, sem esperar o próximo ciclo
    const aoVoltarOnline = () => void controlador.salvarAgora();
    // Trocou de aba: salva sem esperar a pausa na digitação
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') void controlador.salvarAgora();
    };
    window.addEventListener('online', aoVoltarOnline);
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      window.removeEventListener('online', aoVoltarOnline);
      document.removeEventListener('visibilitychange', aoEsconder);
      controlador.encerrar(false); // mantém a cópia local se algo ainda não foi salvo
    };
  }, [idRedacao, textoDoServidor]);

  const alterar = useCallback((novo: string) => {
    setTexto(novo);
    controladorRef.current?.alterar(novo);
  }, []);

  const salvarAgora = useCallback(async () => (await controladorRef.current?.salvarAgora()) ?? false, []);
  const encerrar = useCallback((limparBackup: boolean) => controladorRef.current?.encerrar(limparBackup), []);

  return { texto, alterar, estado, salvoEm, salvarAgora, encerrar };
}