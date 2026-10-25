'use client';

import { useState, type FormEvent } from 'react';
import { AuthAviso, AuthBotao, AuthCard, AuthFormulario, AuthLink, AuthRodape } from '@/components/layout/AuthCard';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Input } from '@/components/ui/Campos/Campos';
import { useToast } from '@/components/ui/Toast/Toast';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { validarEmail } from '@/lib/validacao';
import { authService } from '@/services/auth';

export function EsqueciSenhaForm() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const invalido = validarEmail(email);
    setErro(invalido);
    if (invalido) return;

    setEnviando(true);
    setErroGeral(null);
    try {
      await authService.esqueciSenha(email.trim());
      setEnviado(true);
    } catch (e) {
      setErroGeral(mensagemDeErro(e));
      if (e instanceof ApiError && e.ehErroDeConexao) toast.erro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <AuthCard idTitulo="titulo-esqueci" titulo="Confira seu e-mail">
        <AuthAviso>
          <Alerta tom="sucesso">
            Se o e-mail <strong>{email.trim()}</strong> estiver cadastrado, enviaremos um link para criar uma nova senha. O link vale por 1 hora.
          </Alerta>
        </AuthAviso>
        <AuthRodape>
          <AuthLink href="/login">Voltar ao login</AuthLink>
        </AuthRodape>
      </AuthCard>
    );
  }

  return (
    <AuthCard idTitulo="titulo-esqueci" titulo="Esqueceu a senha?" subtitulo="Informe seu e-mail e enviaremos um link para criar uma nova senha">
      {erroGeral && (
        <AuthAviso>
          <Alerta tom="erro">{erroGeral}</Alerta>
        </AuthAviso>
      )}
      <AuthFormulario onSubmit={aoEnviar}>
        <Input
          variante="auth"
          rotulo="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="seu.email@escola.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErroGeral(null);
            if (erro) setErro(validarEmail(e.target.value));
          }}
          erro={erro}
          autoFocus
        />
        <AuthBotao type="submit" carregando={enviando}>
          Enviar link
        </AuthBotao>
      </AuthFormulario>
      <AuthRodape>
        <AuthLink href="/login">Voltar ao login</AuthLink>
      </AuthRodape>
    </AuthCard>
  );
}