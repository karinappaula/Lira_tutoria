'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { AuthAviso, AuthBotao, AuthCard, AuthFormulario, AuthLink, AuthRodape } from '@/components/layout/AuthCard';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Input } from '@/components/ui/Campos/Campos';
import { useToast } from '@/components/ui/Toast/Toast';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { validarCodigoConvite, validarEmail, validarNome, validarSenhaMinima } from '@/lib/validacao';
import { authService } from '@/services/auth';

interface Erros {
  codigo?: string;
  nome?: string;
  email?: string;
  senha?: string;
}

interface Valores {
  codigo: string;
  nome: string;
  email: string;
  senha: string;
}

function validar(v: Valores): Erros {
  return {
    codigo: validarCodigoConvite(v.codigo),
    nome: validarNome(v.nome),
    email: validarEmail(v.email),
    senha: validarSenhaMinima(v.senha),
  };
}

const temErro = (e: Erros) => Boolean(e.codigo || e.nome || e.email || e.senha);

/** O prefixo do código diz para quem é o convite (TUT = Tutor, ALU = Aluno). */
function tituloPeloCodigo(codigo: string): string {
  const c = codigo.trim().toUpperCase();
  if (c.startsWith('TUT-')) return 'Criar conta de Tutor';
  if (c.startsWith('ALU-')) return 'Criar conta de Aluno';
  return 'Criar conta';
}

export function CadastroForm() {
  const router = useRouter();
  const toast = useToast();
  const codigoDoLink = useSearchParams().get('codigo') ?? '';

  const [valores, setValores] = useState<Valores>({ codigo: codigoDoLink.trim().toUpperCase(), nome: '', email: '', senha: '' });
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const jaTentou = useRef(false);

  function alterar(campo: keyof Valores, valor: string) {
    const novos = { ...valores, [campo]: campo === 'codigo' ? valor.toUpperCase() : valor };
    setValores(novos);
    setErroGeral(null);
    if (jaTentou.current) setErros(validar(novos));
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    jaTentou.current = true;
    const encontrados = validar(valores);
    setErros(encontrados);
    if (temErro(encontrados)) return;

    setEnviando(true);
    setErroGeral(null);
    try {
      await authService.cadastrar({ ...valores, nome: valores.nome.trim(), email: valores.email.trim() });
      router.replace('/login?cadastro=ok');
    } catch (erro) {
      if (erro instanceof ApiError) {
        const doServidor: Erros = {
          codigo: erro.mensagemDoCampo('codigo'),
          nome: erro.mensagemDoCampo('nome'),
          email: erro.mensagemDoCampo('email'),
          senha: erro.mensagemDoCampo('senha'),
        };
        if (temErro(doServidor)) setErros(doServidor);
        else setErroGeral(erro.message);
        if (erro.ehErroDeConexao) toast.erro(erro.message);
      } else {
        setErroGeral(mensagemDeErro(erro));
      }
      setEnviando(false);
    }
  }

  return (
    <AuthCard idTitulo="titulo-cadastro" titulo={tituloPeloCodigo(valores.codigo)} subtitulo="Você foi convidado para a plataforma Tutoria de Redações">
      {erroGeral && (
        <AuthAviso>
          <Alerta tom="erro">{erroGeral}</Alerta>
        </AuthAviso>
      )}

      <AuthFormulario onSubmit={aoEnviar}>
        <Input
          variante="auth"
          rotulo="Código do convite"
          name="codigo"
          autoComplete="off"
          placeholder="TUT-ABC123"
          value={valores.codigo}
          onChange={(e) => alterar('codigo', e.target.value)}
          erro={erros.codigo}
          dica={codigoDoLink ? 'Preenchido pelo link do seu convite.' : 'Você recebeu este código do seu professor ou tutor.'}
        />
        <Input
          variante="auth"
          rotulo="Nome"
          name="nome"
          autoComplete="name"
          placeholder="Seu nome completo"
          value={valores.nome}
          onChange={(e) => alterar('nome', e.target.value)}
          erro={erros.nome}
          autoFocus={Boolean(codigoDoLink)}
        />
        <Input
          variante="auth"
          rotulo="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="seu.email@escola.com"
          value={valores.email}
          onChange={(e) => alterar('email', e.target.value)}
          erro={erros.email}
        />
        <Input
          variante="auth"
          rotulo="Senha"
          type="password"
          name="senha"
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          value={valores.senha}
          onChange={(e) => alterar('senha', e.target.value)}
          erro={erros.senha}
        />
        <AuthBotao type="submit" carregando={enviando}>
          Cadastrar
        </AuthBotao>
      </AuthFormulario>

      <AuthRodape>
        <AuthLink href="/login">Já tenho conta. Entrar</AuthLink>
      </AuthRodape>
    </AuthCard>
  );
}