'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { AuthAviso, AuthBotao, AuthCard, AuthFormulario, AuthLink, AuthRodape } from '@/components/layout/AuthCard';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Input } from '@/components/ui/Campos/Campos';
import { useToast } from '@/components/ui/Toast/Toast';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { validarConfirmacaoSenha, validarSenhaMinima } from '@/lib/validacao';
import { authService } from '@/services/auth';

interface Erros {
  senha?: string;
  confirmacao?: string;
}

function validar(senha: string, confirmacao: string): Erros {
  return { senha: validarSenhaMinima(senha), confirmacao: validarConfirmacaoSenha(senha, confirmacao) };
}

export function RedefinirSenhaForm() {
  const router = useRouter();
  const toast = useToast();
  const token = useSearchParams().get('token');

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const jaTentou = useRef(false);

  // Link sem token (copiado pela metade): não adianta mostrar o formulário.
  if (!token) {
    return (
      <AuthCard idTitulo="titulo-redefinir" titulo="Link incompleto">
        <AuthAviso>
          <Alerta tom="erro">Este link de recuperação está incompleto. Peça um novo link para continuar.</Alerta>
        </AuthAviso>
        <AuthRodape>
          <AuthLink href="/esqueci-senha">Pedir novo link</AuthLink>
        </AuthRodape>
      </AuthCard>
    );
  }

  function alterar(novaSenha: string, novaConfirmacao: string) {
    setSenha(novaSenha);
    setConfirmacao(novaConfirmacao);
    setErroGeral(null);
    if (jaTentou.current) setErros(validar(novaSenha, novaConfirmacao));
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    jaTentou.current = true;
    const encontrados = validar(senha, confirmacao);
    setErros(encontrados);
    if (encontrados.senha || encontrados.confirmacao) return;

    setEnviando(true);
    setErroGeral(null);
    try {
      await authService.redefinirSenha(token, senha);
      router.replace('/login?senha=redefinida');
    } catch (erro) {
      if (erro instanceof ApiError) {
        if (erro.codigo === 'LINK_INVALIDO') setLinkInvalido(true);
        const daSenha = erro.mensagemDoCampo('novaSenha');
        if (daSenha) setErros({ senha: daSenha });
        else setErroGeral(erro.message);
        if (erro.ehErroDeConexao) toast.erro(erro.message);
      } else {
        setErroGeral(mensagemDeErro(erro));
      }
      setEnviando(false);
    }
  }

  return (
    <AuthCard idTitulo="titulo-redefinir" titulo="Criar nova senha" subtitulo="Escolha uma senha com pelo menos 8 caracteres">
      {erroGeral && (
        <AuthAviso>
          <Alerta tom="erro">{erroGeral}</Alerta>
        </AuthAviso>
      )}
      <AuthFormulario onSubmit={aoEnviar}>
        <Input
          variante="auth"
          rotulo="Nova senha"
          type="password"
          name="novaSenha"
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          value={senha}
          onChange={(e) => alterar(e.target.value, confirmacao)}
          erro={erros.senha}
          autoFocus
        />
        <Input
          variante="auth"
          rotulo="Repita a nova senha"
          type="password"
          name="confirmacao"
          autoComplete="new-password"
          placeholder="Digite a senha de novo"
          value={confirmacao}
          onChange={(e) => alterar(senha, e.target.value)}
          erro={erros.confirmacao}
        />
        <AuthBotao type="submit" carregando={enviando} disabled={linkInvalido}>
          Salvar nova senha
        </AuthBotao>
      </AuthFormulario>
      <AuthRodape>
        {linkInvalido ? <AuthLink href="/esqueci-senha">Pedir novo link</AuthLink> : <AuthLink href="/login">Voltar ao login</AuthLink>}
      </AuthRodape>
    </AuthCard>
  );
}