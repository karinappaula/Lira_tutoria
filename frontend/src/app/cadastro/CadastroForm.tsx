'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthAviso, AuthBotao, AuthCard, AuthFormulario, AuthLink, AuthRodape } from '@/components/layout/AuthCard';
import { Alerta } from '@/components/ui/Alerta/Alerta';
import { Input } from '@/components/ui/Campos/Campos';
import { useToast } from '@/components/ui/Toast/Toast';
import { ApiError, mensagemDeErro } from '@/lib/erros';
import { validarCodigoConvite, validarEmail, validarNome, validarObrigatorio, validarSenhaMinima } from '@/lib/validacao';
import { authService, type DetalhesConvitePublico, type VerificacaoEmailResultado } from '@/services/auth';

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

function validar(v: Valores, contaExiste: boolean): Erros {
  return {
    codigo: validarCodigoConvite(v.codigo),
    nome: contaExiste ? undefined : validarNome(v.nome),
    email: validarEmail(v.email),
    senha: contaExiste ? validarObrigatorio(v.senha, 'sua senha atual') : validarSenhaMinima(v.senha),
  };
}

const temErro = (e: Erros) => Boolean(e.codigo || e.nome || e.email || e.senha);

/** O prefixo do código diz para quem é o convite (TUT = Tutor, ALU = Aluno). */
function tituloPeloCodigo(codigo: string, contaExiste: boolean): string {
  const c = codigo.trim().toUpperCase();
  if (contaExiste) {
    if (c.startsWith('TUT-')) return 'Vincular perfil de Tutor';
    if (c.startsWith('ALU-')) return 'Vincular perfil de Aluno';
    return 'Vincular perfil';
  }
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
  const [contaExistente, setContaExistente] = useState<VerificacaoEmailResultado | null>(null);
  const [verificandoEmail, setVerificandoEmail] = useState(false);
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

  // Verificação de e-mail existente com debounce
  useEffect(() => {
    const emailLimpo = valores.email.trim();
    if (!emailLimpo || validarEmail(emailLimpo)) {
      setContaExistente(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setVerificandoEmail(true);
      try {
        const resultado = await authService.verificarEmail(emailLimpo);
        if (resultado.existe) {
          setContaExistente(resultado);
          if (resultado.nome) {
            setValores((prev) => ({ ...prev, nome: resultado.nome! }));
          }
        } else {
          setContaExistente(null);
        }
      } catch {
        // Se a verificação falhar (ex: offline), segue fluxo padrão
        setContaExistente(null);
      } finally {
        setVerificandoEmail(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [valores.email]);

  function alterar(campo: keyof Valores, valor: string) {
    const novos = { ...valores, [campo]: campo === 'codigo' ? valor.toUpperCase() : valor };
    setValores(novos);
    setErroGeral(null);
    if (jaTentou.current) setErros(validar(novos, Boolean(contaExistente?.existe)));
  }

  const ehPapelAluno = detalhesConvite?.papel === 'ALUNO' || valores.codigo.startsWith('ALU-');
  const bloqueadoPorVagas = Boolean(detalhesConvite?.papel === 'ALUNO' && (detalhesConvite.lotado || detalhesConvite.vagasRestantes <= 0));
  const bloqueadoPorExpiracao = Boolean(detalhesConvite?.expirado);
  const ehTutorAutoCadastro = Boolean(ehPapelAluno && contaExistente?.papeisExistentes?.includes('TUTOR'));
  const bloqueioGeral = bloqueadoPorVagas || bloqueadoPorExpiracao || ehTutorAutoCadastro;

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    jaTentou.current = true;
    if (bloqueioGeral) {
      if (ehTutorAutoCadastro) {
        setErroGeral('Contas com perfil de Tutor não podem utilizar convites de aluno.');
      } else if (bloqueadoPorVagas) {
        setErroGeral('O limite de vagas deste tutor foi atingido. Novos cadastros estão bloqueados.');
      } else if (bloqueadoPorExpiracao) {
        setErroGeral('Este convite expirou. Solicite um novo link.');
      }
      return;
    }

    const contaExiste = Boolean(contaExistente?.existe);
    const encontrados = validar(valores, contaExiste);
    setErros(encontrados);
    if (temErro(encontrados)) return;

    setEnviando(true);
    setErroGeral(null);
    try {
      await authService.cadastrar({
        codigo: valores.codigo.trim().toUpperCase(),
        nome: contaExiste ? undefined : valores.nome.trim(),
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

  const ehContaExistente = Boolean(contaExistente?.existe);

  return (
    <AuthCard
      idTitulo="titulo-cadastro"
      titulo={tituloPeloCodigo(valores.codigo, ehContaExistente)}
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

      {ehTutorAutoCadastro && (
        <AuthAviso>
          <Alerta tom="erro">
            Sua conta possui perfil de Tutor. Não é permitido utilizar convites de aluno (auto-cadastro não permitido).
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

      {ehContaExistente && !bloqueioGeral && (
        <AuthAviso>
          <Alerta tom="info">
            Identificamos que você já possui cadastro no LIRA {contaExistente?.nome ? `(${contaExistente.nome})` : ''}.
            Digite sua senha atual para autorizar o vínculo deste novo perfil.
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
          dica={verificandoEmail ? 'Verificando e-mail...' : undefined}
        />

        {!ehContaExistente && (
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
        )}

        <Input
          variante="auth"
          rotulo={ehContaExistente ? 'Senha Atual' : 'Senha'}
          type="password"
          name="senha"
          autoComplete={ehContaExistente ? 'current-password' : 'new-password'}
          placeholder={ehContaExistente ? 'Sua senha atual' : 'Mínimo de 8 caracteres'}
          value={valores.senha}
          onChange={(e) => alterar('senha', e.target.value)}
          erro={erros.senha}
          dica={ehContaExistente ? 'Digite sua senha cadastrada no LIRA para confirmar o vínculo.' : undefined}
        />

        <AuthBotao type="submit" carregando={enviando} disabled={bloqueioGeral}>
          {ehContaExistente ? 'Vincular Perfil' : 'Cadastrar'}
        </AuthBotao>
      </AuthFormulario>

      <AuthRodape>
        <AuthLink href="/login">Já tenho conta. Entrar</AuthLink>
      </AuthRodape>
    </AuthCard>
  );
}
