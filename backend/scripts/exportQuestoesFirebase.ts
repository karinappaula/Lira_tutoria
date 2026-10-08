/**
 * Exporta a coleção `questoes` do Firestore para um JSON local,
 * que depois é importado para o MySQL por scripts/importQuestoes.ts.
 *
 * COMO USAR (na máquina que tem acesso ao Firebase, não neste ambiente):
 *   1. Baixe a chave da service account no console do Firebase
 *      (Configurações do projeto > Contas de serviço > Gerar nova chave).
 *   2. Salve o arquivo como firebase-service-account.json na raiz do
 *      backend (já está no .gitignore — NUNCA commitar essa chave).
 *   3. Rode: npm run export:questoes
 *
 * Gera: prisma/questoes-export.json
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as admin from "firebase-admin";

const CAMINHO_SERVICE_ACCOUNT =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "./firebase-service-account.json";

async function main() {
  if (!fs.existsSync(CAMINHO_SERVICE_ACCOUNT)) {
    console.error(
      `Arquivo de credenciais não encontrado em "${CAMINHO_SERVICE_ACCOUNT}". ` +
        `Baixe a service account key no console do Firebase antes de rodar este script.`
    );
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(require(path.resolve(CAMINHO_SERVICE_ACCOUNT))),
  });

  const db = admin.firestore();
  const snapshot = await db.collection("questoes").get();

  const questoes = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      idOriginal: doc.id,
      vestibular: data.vestibular,
      ano: data.ano,
      numeroQuestao: data.numeroQuestao ?? null,
      assunto: data.assunto,
      dificuldade: data.dificuldade,
      enunciado: data.enunciado,
      imagemUrl: data.imagemUrl ?? null,
      alternativas: data.alternativas,
      respostaCorreta: data.respostaCorreta,
      explicacao: data.explicacao ?? null,
    };
  });

  const destino = path.resolve(__dirname, "../prisma/questoes-export.json");
  fs.writeFileSync(destino, JSON.stringify(questoes, null, 2), "utf-8");

  console.log(`${questoes.length} questões exportadas para ${destino}`);
}

main().catch((erro) => {
  console.error("Erro ao exportar questões do Firebase:", erro);
  process.exit(1);
});
