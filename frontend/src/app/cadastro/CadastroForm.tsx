'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthAviso, AuthBotao, AuthCard, AuthFormulario, AuthLink, AuthRodape } from '@/components/layout/AuthCard';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Input } from '@/components/ui/Campos/Campos';
import { useToast } from '@/components/ui/Toast/Toast';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { validarCodigoConvite, validarEmail, validarNome, validarSenhaMinima } from '@/lib/validacao';
import { authService, type DetalhesConvitePublico } from '@/services/auth';

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
  const [detalhesConvite, setDetalhesConvite] = useState<DetalhesConvitePublico | null>(null);
  const [verificandoConvite, setVerificandoConvite] = useState(false);
  const jaTentou = useRef(false);

  // Consulta detalhes e ocupação do convite
  useEffect(() => {
    const cod = valores.codigo.trim().toUpperCase();
    if (!cod || Boolean(validarCodigoConvite(cod))) {
      setDetalhesConvite(null);
      return;
    }

    let ativo = true;
    setVerificandoConvite(true);
    authService
      .detalhesConvite(cod)
      .then((det) => {
        if (ativo) setDetalhesConvite(det);
      })
      .catch(() => {
        if (ativo) setDetalhesConvite(null);
      })
      .finally(() => {
        if (ativo) setVerificandoConvite(false);
      });

    return () => {
      ativo = false;
    };
  }, [valores.codigo]);

  function alterar(campo: keyof Valores, valor: string) {
    const novos = { ...valores, [campo]: campo === 'codigo' ? valor.toUpperCase() : valor };
    setValores(novos);
    setErroGeral(null);
    if (jaTentou.current) setErros(validar(novos));
  }

  const bloqueadoPorVagas = Boolean(detalhesConvite?.papel === 'ALUNO' && (detalhesConvite.lotado || detalhesConvite.vagasRestantes <= 0));
  const bloqueadoPorExpiracao = Boolean(detalhesConvite?.expirado);
  const bloqueioGeral = bloqueadoPorVagas || bloqueadoPorExpiracao;

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    jaTentou.current = true;
    if (bloqueioGeral) {
      if (bloqueadoPorVagas) {
        setErroGeral('O limite de vagas deste tutor foi atingido. Novos cadastros estão bloqueados.');
      } else if (bloqueadoPorExpiracao) {
        setErroGeral('Este convite expirou. Solicite um novo link.');
      }
      return;
    }

    const encontrados = validar(valores);
    setErros(encontrados);
    if (temErro(encontrados)) return;

    setEnviando(true);
    setErroGeral(null);
    try {
      await authService.cadastrar({
        codigo: valores.codigo.trim().toUpperCase(),
        nome: valores.nome.trim(),
        email: valores.email.trim(),
        senha: valores.senha,
      });
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
    <AuthCard
      idTitulo="titulo-cadastro"
      titulo={tituloPeloCodigo(valores.codigo)}
      subtitulo="Você foi convidado para a plataforma Tutoria de Redações"
    >
      {erroGeral && (
        <AuthAviso>
          <Alerta tom="erro">{erroGeral}</Alerta>
        </AuthAviso>
      )}

      {bloqueadoPorVagas && (
        <AuthAviso>
          <Alerta tom="erro">
            O limite de 10 tutorados deste grupo foi atingido ({detalhesConvite?.usos}/{detalhesConvite?.usosMaximos} alunos ativos). Novos cadastros estão bloqueados.
          </Alerta>
        </AuthAviso>
      )}

      {bloqueadoPorExpiracao && (
        <AuthAviso>
          <Alerta tom="erro">
            Este convite expirou. Solicite um novo link atualizado ao seu tutor.
          </Alerta>
        </AuthAviso>
      )}

      {detalhesConvite && !bloqueioGeral && detalhesConvite.papel === 'ALUNO' && (
        <AuthAviso>
          <Alerta tom="sucesso">
            Turma: <strong>{detalhesConvite.nomeTurma}</strong>
            {detalhesConvite.nomeTutor ? ` • Tutor: ${detalhesConvite.nomeTutor}` : ''} •{' '}
            <strong>{detalhesConvite.vagasRestantes} {detalhesConvite.vagasRestantes === 1 ? 'vaga restante' : 'vagas restantes'}</strong> de {detalhesConvite.usosMaximos}
          </Alerta>
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
          dica={verificandoConvite ? 'Verificando convite...' : codigoDoLink ? 'Preenchido pelo link do seu convite.' : 'Você recebeu este código do seu professor ou tutor.'}
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
          rotulo="Senha"
          type="password"
          name="senha"
          autoComplete="new-password"
          placeholder="Senha da conta ou nova senha"
          value={valores.senha}
          onChange={(e) => alterar('senha', e.target.value)}
          erro={erros.senha}
        />

        <AuthBotao type="submit" carregando={enviando} disabled={bloqueioGeral}>
          Cadastrar ou vincular perfil
        </AuthBotao>
      </AuthFormulario>

      <AuthRodape>
        <AuthLink href="/login">Já tenho conta. Entrar</AuthLink>
      </AuthRodape>
    </AuthCard>
  );
}
