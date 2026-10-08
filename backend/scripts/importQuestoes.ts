/**
 * Lê prisma/questoes-export.json (gerado por exportQuestoesFirebase.ts)
 * e popula QUESTAO, ALTERNATIVA, ASSUNTO e QUESTAO_ASSUNTO no MySQL.
 *
 * Uso: npm run import:questoes
 * (chamado automaticamente pelo prisma/seed.ts se o JSON existir)
 */
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../src/db/prisma";

const CAMINHO_JSON = path.resolve(__dirname, "../prisma/questoes-export.json");

// Firebase salvava "Fácil"/"Média"/"Difícil" (com acento); o schema
// novo usa valores normalizados sem acento, em maiúsculas.
const MAPA_DIFICULDADE: Record<string, string> = {
  "Fácil": "FACIL",
  "Média": "MEDIA",
  "Difícil": "DIFICIL",
};

interface QuestaoExportada {
  vestibular: string;
  ano: number;
  numeroQuestao: number | null;
  assunto: string;
  dificuldade: string;
  enunciado: string;
  imagemUrl: string | null;
  alternativas: Record<string, string>;
  respostaCorreta: string;
  explicacao: string | null;
}

export async function importarQuestoes(idUsuarioAutor: number) {
  if (!fs.existsSync(CAMINHO_JSON)) {
    console.log(
      "Nenhum prisma/questoes-export.json encontrado — pulando importação de questões " +
        "(rode 'npm run export:questoes' antes, se quiser trazer as questões do Firebase)."
    );
    return;
  }

  const questoes: QuestaoExportada[] = JSON.parse(fs.readFileSync(CAMINHO_JSON, "utf-8"));
  let importadas = 0;

  for (const q of questoes) {
    const nomeAssunto = q.assunto;

    // upsert do assunto — evita duplicar "Literatura" a cada questão
    const assunto = await prisma.assunto.upsert({
      where: { nomeAssunto },
      update: {},
      create: { nomeAssunto },
    });

    const grauDificuldade = MAPA_DIFICULDADE[q.dificuldade] ?? q.dificuldade.toUpperCase();

    const questaoCriada = await prisma.questao.create({
      data: {
        enunciado: q.enunciado,
        imagemUrl: q.imagemUrl,
        vestibular: q.vestibular,
        ano: q.ano,
        numeroQuestao: q.numeroQuestao,
        grauDificuldade,
        explicacaoGabarito: q.explicacao,
        criadoPor: idUsuarioAutor,
        assuntos: {
          create: { idAssunto: assunto.id },
        },
        alternativas: {
          create: Object.entries(q.alternativas).map(([letra, texto]) => ({
            letraOpcao: letra,
            textoAlternativa: texto,
            alternativaCorreta: letra === q.respostaCorreta,
          })),
        },
      },
    });

    importadas++;
    if (importadas % 10 === 0) console.log(`  ${importadas}/${questoes.length} questões importadas...`);
  }

  console.log(`Importação concluída: ${importadas} questões migradas do Firebase para o MySQL.`);
}
