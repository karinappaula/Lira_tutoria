'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { AuthAviso, AuthBotao, AuthCard, AuthFormulario, AuthLink, AuthRodape, AuthSeparador } from '@/components/layout/AuthCard';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Input } from '@/components/ui/Campos/Campos';
import { useToast } from '@/components/ui/Toast/Toast';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { HOME_DO_PAPEL } from '@/lib/papeis';
import { validarEmail, validarObrigatorio } from '@/lib/validacao';
import { authService } from '@/services/auth';

interface Erros {
  email?: string;
  senha?: string;
}

function validar(email: string, senha: string): Erros {
  return { email: validarEmail(email), senha: validarObrigatorio(senha, 'sua senha') };
}

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const jaTentou = useRef(false);

  // Mensagens que chegam de outras telas pelo endereço (?sessao=expirada, ?cadastro=ok, ?senha=redefinida)
  const aviso = params.get('sessao') === 'expirada'
    ? { tom: 'info' as const, texto: 'Sua sessão expirou. Entre novamente para continuar.' }
    : params.get('cadastro') === 'ok'
      ? { tom: 'sucesso' as const, texto: 'Conta criada com sucesso! Entre com seu e-mail e senha.' }
      : params.get('senha') === 'redefinida'
        ? { tom: 'sucesso' as const, texto: 'Senha alterada com sucesso! Entre com a nova senha.' }
        : null;

  function aoDigitar(novoEmail: string, novaSenha: string) {
    setEmail(novoEmail);
    setSenha(novaSenha);
    setErroGeral(null);
    if (jaTentou.current) setErros(validar(novoEmail, novaSenha));
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    jaTentou.current = true;
    const encontrados = validar(email, senha);
    setErros(encontrados);
    if (encontrados.email || encontrados.senha) return;

    setEnviando(true);
    setErroGeral(null);
    try {
      const resultado = await authService.login(email.trim(), senha);
      router.replace(resultado.tipo === 'sessao' ? HOME_DO_PAPEL[resultado.papelAtivo] : '/escolher-papel');
      router.refresh();
    } catch (erro) {
      if (erro instanceof ApiError) {
        const doEmail = erro.mensagemDoCampo('email');
        const daSenha = erro.mensagemDoCampo('senha');
        if (doEmail || daSenha) setErros({ email: doEmail, senha: daSenha });
        else setErroGeral(erro.message);
        if (erro.ehErroDeConexao) toast.erro(erro.message);
      } else {
        setErroGeral(mensagemDeErro(erro));
      }
      setEnviando(false);
    }
  }

  return (
    <AuthCard idTitulo="titulo-login" titulo="Bem-vindo!" subtitulo="Entre com sua conta para continuar">
      {erroGeral ? (
        <AuthAviso>
          <Alerta tom="erro">{erroGeral}</Alerta>
        </AuthAviso>
      ) : (
        aviso && (
          <AuthAviso>
            <Alerta tom={aviso.tom}>{aviso.texto}</Alerta>
          </AuthAviso>
        )
      )}

      <AuthFormulario onSubmit={aoEnviar}>
        <Input
          variante="auth"
          rotulo="E-mail"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          placeholder="seu.email@escola.com"
          value={email}
          onChange={(e) => aoDigitar(e.target.value, senha)}
          erro={erros.email}
          autoFocus
        />
        <Input
          variante="auth"
          rotulo="Senha"
          type="password"
          name="senha"
          autoComplete="current-password"
          placeholder="Sua senha"
          value={senha}
          onChange={(e) => aoDigitar(email, e.target.value)}
          erro={erros.senha}
        />
        <AuthBotao type="submit" carregando={enviando}>
          Entrar
        </AuthBotao>
      </AuthFormulario>

      <AuthRodape>
        <AuthLink href="/esqueci-senha">Esqueci minha senha</AuthLink>
        <AuthSeparador />
        <AuthLink href="/cadastro">Tenho um código de convite</AuthLink>
      </AuthRodape>
    </AuthCard>
  );
}