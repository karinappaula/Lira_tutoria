/**
 * Popula o banco com dados de exemplo para a POC (Admin, Tutor, Aluno,
 * Turma, Tema, Tarefa) e importa as questões do Firebase.
 *
 * Atualizado para o Schema V3 (3NF + Herança 1:1 sem a tabela associativa TurmaTutor).
 *
 * Uso: npm run prisma:seed ou npx prisma db seed
 */

import * as bcrypt from "bcrypt";
import { prisma } from "../src/db/prisma";
import { importarQuestoes } from "../scripts/importQuestoes";

const SENHA_PADRAO_SEED = "senha123"; // Apenas para ambiente demosntrativo

async function main() {
  console.log("Iniciando o povoamento do banco de dados (Seed)...");

  const senhaHash = await bcrypt.hash(SENHA_PADRAO_SEED, 10);

  // 1. Criar Turma
  const turma = await prisma.turma.create({
    data: {
      nome: "3º A",
      anoLetivo: 2026,
      vestibularFoco: "ENEM",
      status: "ATIVA",
    },
  });

  // 2. Criar Administrador (Professora Ilva)
  const usuarioAdmin = await prisma.usuario.create({
    data: {
      nome: "Ilva Professora",
      email: "admin@lira.com",
      senhaHash,
      status: "ATIVO",
    },
  });

  await prisma.administrador.create({
    data: {
      idUsuario: usuarioAdmin.id,
    },
  });

  // 3. Criar Tutor Alessandro
  const usuarioAlessandro = await prisma.usuario.create({
    data: {
      nome: "Alessandro Tutor",
      email: "alessandro@lira.com",
      senhaHash,
      status: "ATIVO",
    },
  });

  const tutorAlessandro = await prisma.tutor.create({
    data: {
      idUsuario: usuarioAlessandro.id,
      idTurma: turma.id, // Vínculo direto no Tutor (3NF)
    },
  });

  // 4. Criar Tutora Karina
  const usuarioTutor = await prisma.usuario.create({
    data: {
      nome: "Karina Tutora",
      email: "tutor@lira.com",
      senhaHash,
      status: "ATIVO",
    },
  });

  const tutorKarina = await prisma.tutor.create({
    data: {
      idUsuario: usuarioTutor.id,
      idTurma: turma.id, // Vínculo direto na Turma
    },
  });

  // 5. Criar Aluno Exemplo (tutorado por Karina)
  const usuarioAluno = await prisma.usuario.create({
    data: {
      nome: "Aluno Exemplo",
      email: "aluno@lira.com",
      senhaHash,
      status: "ATIVO",
    },
  });

  await prisma.aluno.create({
    data: {
      idUsuario: usuarioAluno.id,
      idTutor: tutorKarina.idUsuario, // FK para Karina (Turma é derivada de Karina -> Turma)
    },
  });

  // 6. Caso especial: Karina é Tutora E também Aluna tutorada por Alessandro
  await prisma.aluno.create({
    data: {
      idUsuario: usuarioTutor.id, // Reutiliza idUsuario da Karina
      idTutor: tutorAlessandro.idUsuario, // Tutor do Alessandro
    },
  });

  // 7. Criar Tema de Exemplo
  const tema = await prisma.tema.create({
    data: {
      tituloTema: "Desafios da educação digital no Brasil",
      origem: "Tutor",
      textoMotivador: "Texto motivador sobre o uso e impactos das tecnologias digitais nas escolas...",
    },
  });

  // 8. Criar Tarefa de Exemplo
  await prisma.tarefa.create({
    data: {
      idTutor: tutorKarina.idUsuario,
      idTurma: turma.id,
      idTema: tema.id,
      tituloTarefa: "Redação da semana",
      descricao: "Escreva um texto dissertativo-argumentativo sobre o tema.",
      prazoEntrega: new Date("2026-11-01T23:59:00Z"),
      modalidade: "AVALIATIVA",
    },
  });

  // 8b. Convites de exemplo para demonstrar o cadastro (POST /auth/cadastro)
  const validade = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
  await prisma.convite.createMany({
    data: [
      {
        codigo: "TUT0000001",
        papel: "TUTOR",
        idTurma: turma.id,
        idCriadoPor: usuarioAdmin.id,
        expiraEm: validade,
      },
      {
        codigo: "ALU0000001",
        papel: "ALUNO",
        idTurma: turma.id,
        idTutor: tutorKarina.idUsuario, // aluno novo será tutorado da Karina
        idCriadoPor: usuarioAdmin.id,
        expiraEm: validade,
      },
    ],
  });

  console.log("✅ Dados de exemplo criados com sucesso:");
  console.log(`  Admin:      admin@lira.com      / ${SENHA_PADRAO_SEED}`);
  console.log(` Tutor:      tutor@lira.com      / ${SENHA_PADRAO_SEED}`);
  console.log(` Aluno:      aluno@lira.com      / ${SENHA_PADRAO_SEED}`);
  console.log(` Alessandro: alessandro@lira.com / ${SENHA_PADRAO_SEED}`);
  console.log(" Convites:   TUT0000001 (Tutor), ALU0000001 (Aluno do Karina)");

  // 9. Importar Questões migradas do Firebase.
  // Desligado por padrão: só roda com SEED_QUESTOES=1, para o seed não falhar
  // enquanto o arquivo exportado do Firebase ainda não existe.
  if (process.env.SEED_QUESTOES === "1") {
    console.log("Importando banco de questões do Firebase...");
    await importarQuestoes(usuarioAdmin.id);
  } else {
    console.log("Importação de questões ignorada (use SEED_QUESTOES=1 para ativar).");
  }

  console.log("Seed concluído!");
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());