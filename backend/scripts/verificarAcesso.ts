/**
 * Verificação de acesso (RNF03 / RN01 / RN13).
 *
 * Roda contra a API já em execução e usa os usuários do seed. Não altera
 * nenhum dado: só faz consultas (GET) e tentativas de acesso proibidas.
 *
 * Uso:   npm run verificar:acesso
 * Antes: npm run dev  (em outro terminal) e npm run prisma:seed
 *
 * Variáveis opcionais: API_URL (padrão http://localhost:3333),
 * SENHA_PADRAO (padrão senha123), MAX_ID (padrão 80).
 */

const API = process.env.API_URL ?? "http://localhost:3333";
const SENHA = process.env.SENHA_PADRAO ?? "senha123";
const MAX_ID = Number(process.env.MAX_ID ?? 80);

type Papel = "ADMINISTRADOR" | "TUTOR" | "ALUNO";

interface Conta {
  rotulo: string;
  email: string;
  papel: Papel;
}

// Ajuste e-mails/papéis conforme o seu banco. Contas que não existirem são
// puladas com um aviso. Para cobrir bem o isolamento entre Tutores, mantenha
// pelo menos dois Tutores e dois alunos de Tutores diferentes.
const CONTAS: Conta[] = [
  { rotulo: "admin", email: "admin@lira.com", papel: "ADMINISTRADOR" },
  { rotulo: "tutor (Alessandro)", email: "alessandro@lira.com", papel: "TUTOR" },
  { rotulo: "tutor (Karina)", email: "tutor@lira.com", papel: "TUTOR" },
  { rotulo: "aluno", email: "aluno@lira.com", papel: "ALUNO" },
  { rotulo: "Karina como aluna", email: "tutor@lira.com", papel: "ALUNO" },
];

interface Resposta {
  status: number;
  dados: unknown;
}

async function chamar(metodo: string, caminho: string, token?: string, corpo?: unknown): Promise<Resposta> {
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  let dados: unknown = null;
  try {
    dados = await resposta.json();
  } catch {
    dados = null;
  }
  return { status: resposta.status, dados };
}

function objeto(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

async function entrar(conta: Conta): Promise<string | null> {
  const login = await chamar("POST", "/auth/login", undefined, { email: conta.email, senha: SENHA });
  if (login.status !== 200) return null;
  const dados = objeto(login.dados);
  if (dados.tipo === "sessao") {
    return dados.papelAtivo === conta.papel && typeof dados.token === "string" ? dados.token : null;
  }
  const escolha = await chamar("POST", "/auth/selecionar-papel", undefined, {
    tokenPendente: dados.token,
    papel: conta.papel,
  });
  const sessao = objeto(escolha.dados);
  return escolha.status === 200 && typeof sessao.token === "string" ? sessao.token : null;
}

let total = 0;
const falhas: string[] = [];

function registrar(ok: boolean, descricao: string, detalhe = "") {
  total += 1;
  if (!ok) falhas.push(`${descricao}${detalhe ? ` -> ${detalhe}` : ""}`);
}

// IDs de uma lista de objetos com a chave informada (ex.: "id", "idComunicado").
function idsDe(dados: unknown, chave = "id"): Set<number> {
  const lista = Array.isArray(dados) ? dados : Array.isArray(objeto(dados).itens) ? (objeto(dados).itens as unknown[]) : [];
  const ids = new Set<number>();
  for (const item of lista) {
    const valor = objeto(item)[chave];
    if (typeof valor === "number") ids.add(valor);
  }
  return ids;
}

// ------------------------------------------------ 1) rotas sem token

const ROTAS_PROTEGIDAS = [
  "/auth/me", "/turmas", "/temas", "/tarefas", "/redacoes", "/questoes", "/assuntos", "/simulados",
  "/caderno-erros", "/comunicados", "/comunicados/nao-lidos", "/correcoes/pendentes",
  "/indicadores/aluno", "/indicadores/tutor/alunos", "/indicadores/admin/turmas", "/usuarios", "/convites",
];

async function verificarSemToken() {
  for (const caminho of ROTAS_PROTEGIDAS) {
    const r = await chamar("GET", caminho);
    registrar(r.status === 401, `Sem token: GET ${caminho} deve retornar 401`, `recebeu ${r.status}`);
  }
}

// ------------------------------------------- 2) permissão por papel

// [papel, método, caminho, status esperado]. O id 999999 não existe: o que
// importa é que a barreira de papel responda 403 ANTES de olhar o recurso.
const PROIBIDOS: [Papel, string, string][] = [
  ["ALUNO", "GET", "/usuarios"],
  ["ALUNO", "GET", "/convites"],
  ["ALUNO", "GET", "/correcoes/pendentes"],
  ["ALUNO", "GET", "/indicadores/tutor/alunos"],
  ["ALUNO", "GET", "/indicadores/admin/turmas"],
  ["ALUNO", "GET", "/indicadores/admin/tutores"],
  ["ALUNO", "GET", "/indicadores/alunos/999999"],
  ["ALUNO", "GET", "/redacoes/aguardando-correcao"],
  ["ALUNO", "GET", "/comunicados/enviados"],
  ["ALUNO", "GET", "/questoes/999999"],
  ["ALUNO", "POST", "/questoes"],
  ["ALUNO", "POST", "/assuntos"],
  ["ALUNO", "POST", "/turmas"],
  ["ALUNO", "POST", "/tarefas"],
  ["ALUNO", "POST", "/comunicados"],
  ["ALUNO", "POST", "/usuarios/999999/link-redefinicao"],
  ["ALUNO", "POST", "/correcoes/999999/aprovar"],
  ["TUTOR", "GET", "/usuarios"],
  ["TUTOR", "GET", "/convites"],
  ["TUTOR", "GET", "/indicadores/aluno"],
  ["TUTOR", "GET", "/indicadores/admin/turmas"],
  ["TUTOR", "GET", "/indicadores/admin/tutores"],
  ["TUTOR", "GET", "/simulados"],
  ["TUTOR", "GET", "/caderno-erros"],
  ["TUTOR", "GET", "/questoes/999999"],
  ["TUTOR", "POST", "/questoes"],
  ["TUTOR", "POST", "/assuntos"],
  ["TUTOR", "POST", "/turmas"],
  ["ALUNO", "POST", "/temas"],
  ["ALUNO", "PATCH", "/temas/999999"],
  ["ALUNO", "DELETE", "/temas/999999"],
  ["TUTOR", "POST", "/redacoes"],
  ["TUTOR", "POST", "/simulados"],
  ["TUTOR", "POST", "/correcoes/999999/aprovar"],
  ["TUTOR", "POST", "/correcoes/999999/solicitar-ajuste"],
  ["TUTOR", "PATCH", "/alunos/999999/tutor"],
  ["TUTOR", "PATCH", "/tutores/999999/turma"],
  ["TUTOR", "PATCH", "/usuarios/999999/status"],
  ["TUTOR", "POST", "/usuarios/999999/link-redefinicao"],
  ["ADMINISTRADOR", "POST", "/redacoes"],
  ["ADMINISTRADOR", "POST", "/redacoes/correcoes"],
  ["ADMINISTRADOR", "POST", "/simulados"],
  ["ADMINISTRADOR", "GET", "/simulados"],
  ["ADMINISTRADOR", "GET", "/indicadores/aluno"],
];

async function verificarPapeis(sessoes: Map<Papel, string>) {
  for (const [papel, metodo, caminho] of PROIBIDOS) {
    const token = sessoes.get(papel);
    if (!token) continue;
    const r = await chamar(metodo, caminho, token, metodo === "GET" ? undefined : {});
    registrar(r.status === 403, `${papel}: ${metodo} ${caminho} deve retornar 403`, `recebeu ${r.status}`);
  }
}

// -------------------------------------- 3) acesso a dados de outros

interface Recurso {
  nome: string;
  lista: string;
  chaveId: string;
  detalhe: (id: number) => string;
}

const RECURSOS: Recurso[] = [
  { nome: "redações", lista: "/redacoes", chaveId: "id", detalhe: (id) => `/redacoes/${id}` },
  { nome: "tarefas", lista: "/tarefas", chaveId: "id", detalhe: (id) => `/tarefas/${id}` },
  { nome: "temas", lista: "/temas", chaveId: "id", detalhe: (id) => `/temas/${id}` },
  { nome: "turmas", lista: "/turmas", chaveId: "id", detalhe: (id) => `/turmas/${id}` },
  { nome: "simulados", lista: "/simulados", chaveId: "id", detalhe: (id) => `/simulados/${id}` },
  { nome: "resultado de simulados", lista: "/simulados", chaveId: "id", detalhe: (id) => `/simulados/${id}/resultado` },
];

// Regra: para cada id de 1 a MAX_ID, o recurso só pode responder 200 se o id
// estiver na lista do próprio usuário. Qualquer outro 200 é acesso indevido.
async function varrer(rotulo: string, token: string, nome: string, proprios: Set<number>, detalhe: (id: number) => string) {
  const indevidos: number[] = [];
  const bloqueadosSemMotivo: number[] = [];
  for (let id = 1; id <= MAX_ID; id += 1) {
    const r = await chamar("GET", detalhe(id), token);
    if (r.status === 200 && !proprios.has(id)) indevidos.push(id);
    if (proprios.has(id) && r.status === 403) bloqueadosSemMotivo.push(id);
  }
  registrar(indevidos.length === 0, `${rotulo}: ${nome} - não pode abrir itens de outras pessoas`, `abriu os ids ${indevidos.join(", ")}`);
  registrar(
    bloqueadosSemMotivo.length === 0,
    `${rotulo}: ${nome} - deve conseguir abrir os próprios itens`,
    `bloqueado nos ids ${bloqueadosSemMotivo.join(", ")}`
  );
}

async function verificarIsolamento(conta: Conta, token: string) {
  const rotulo = conta.rotulo;
  if (conta.papel === "ADMINISTRADOR") return; // a Administração tem visão geral (RN13)

  for (const recurso of RECURSOS) {
    const lista = await chamar("GET", recurso.lista, token);
    // Lista proibida para o papel (ex.: tutor em /simulados): nenhum id é "próprio".
    const proprios = lista.status === 200 ? idsDe(lista.dados, recurso.chaveId) : new Set<number>();
    // O resultado de simulado só abre para quem finalizou; vale a mesma regra.
    await varrer(rotulo, token, recurso.nome, proprios, recurso.detalhe);
  }

  // Correções: os ids próprios vêm do detalhe das redações que a pessoa enxerga.
  const redacoes = await chamar("GET", "/redacoes", token);
  const correcoesPropias = new Set<number>();
  for (const idRedacao of idsDe(redacoes.dados)) {
    const detalhe = await chamar("GET", `/redacoes/${idRedacao}`, token);
    const versoes = objeto(detalhe.dados).versoes;
    if (Array.isArray(versoes)) {
      for (const versao of versoes) {
        const correcoes = objeto(versao).correcoes;
        if (Array.isArray(correcoes)) {
          for (const correcao of correcoes) {
            const idCorrecao = objeto(correcao).id;
            if (typeof idCorrecao === "number") correcoesPropias.add(idCorrecao);
          }
        }
      }
    }
  }
  await varrer(rotulo, token, "correções", correcoesPropias, (id) => `/correcoes/${id}`);

  // Comunicados: o que recebeu ou enviou.
  const recebidos = conta.papel === "ALUNO" || conta.papel === "TUTOR" ? await chamar("GET", "/comunicados", token) : null;
  const enviados = conta.papel === "TUTOR" ? await chamar("GET", "/comunicados/enviados", token) : null;
  const comunicadosProprios = new Set<number>([
    ...idsDe(recebidos?.dados, "idComunicado"),
    ...idsDe(enviados?.dados, "id"),
  ]);
  await varrer(rotulo, token, "comunicados", comunicadosProprios, (id) => `/comunicados/${id}`);

  // Desempenho de alunos: o Tutor só vê os tutorados (RN13); o aluno não vê ninguém.
  if (conta.papel === "TUTOR") {
    const tutorados = await chamar("GET", "/indicadores/tutor/alunos", token);
    await varrer(rotulo, token, "desempenho de alunos", idsDe(tutorados.dados, "idAluno"), (id) => `/indicadores/alunos/${id}`);
  }
}

// ------------------------------------------------------------ execução

async function principal() {
  console.log(`Verificação de acesso em ${API} (ids de 1 a ${MAX_ID})\n`);
  const saude = await chamar("GET", "/health").catch(() => null);
  if (!saude) {
    console.error("A API não respondeu. Rode `npm run dev` em outro terminal e tente de novo.");
    process.exit(2);
  }

  const sessoes = new Map<Papel, string>();
  const entradas: { conta: Conta; token: string }[] = [];
  for (const conta of CONTAS) {
    const token = await entrar(conta);
    if (!token) {
      console.warn(`Aviso: não foi possível entrar como "${conta.rotulo}" (${conta.email}). Conta pulada.`);
      continue;
    }
    entradas.push({ conta, token });
    if (!sessoes.has(conta.papel)) sessoes.set(conta.papel, token);
  }
  if (entradas.length === 0) {
    console.error("Nenhuma conta conseguiu entrar. Confira o seed, a senha e a lista CONTAS.");
    process.exit(2);
  }

  console.log("1/3 Rotas sem token...");
  await verificarSemToken();
  console.log("2/3 Permissão por papel...");
  await verificarPapeis(sessoes);
  console.log("3/3 Acesso a dados de outras pessoas...");
  for (const { conta, token } of entradas) {
    await verificarIsolamento(conta, token);
  }

  console.log(`\n${total - falhas.length} de ${total} verificações passaram.`);
  if (falhas.length > 0) {
    console.error(`\nFALHAS (${falhas.length}):`);
    for (const falha of falhas) console.error(`  - ${falha}`);
    process.exit(1);
  }
  console.log("Nenhum acesso indevido encontrado.");
}

principal().catch((erro) => {
  console.error("Erro inesperado na verificação:", erro);
  process.exit(2);
});
