import { Router } from "express";
import { exigirAutenticacao, exigirPapel } from "../middlewares/auth.middleware";
import {
  getDesempenhoRedacoes,
  getDesempenhoSimulados,
  getDesempenhoTurmas,
  getDesempenhoTutores,
  getHistoricoCorrecoes,
  getIndicadoresAluno,
  getIndicadoresDoAluno,
  getTutorados,
} from "../controllers/indicadores.controller";

const router = Router();
const aluno = [exigirAutenticacao, exigirPapel("ALUNO")];
const tutor = [exigirAutenticacao, exigirPapel("TUTOR")];
const admin = [exigirAutenticacao, exigirPapel("ADMINISTRADOR")];
const gestao = [exigirAutenticacao, exigirPapel("ADMINISTRADOR", "TUTOR")];

// Aluno: tela "Estatísticas".
router.get("/indicadores/aluno", ...aluno, getIndicadoresAluno);

// Tutor: Meus alunos, Desempenho em Redações e ranking dos simulados.
router.get("/indicadores/tutor/alunos", ...tutor, getTutorados);
router.get("/indicadores/tutor/redacoes", ...tutor, getDesempenhoRedacoes);
router.get("/indicadores/tutor/simulados", ...tutor, getDesempenhoSimulados);

// Tutor (só tutorados) e Administração: "Ver desempenho" de um aluno e histórico.
router.get("/indicadores/alunos/:idAluno", ...gestao, getIndicadoresDoAluno);
router.get("/indicadores/historico-correcoes", ...gestao, getHistoricoCorrecoes);

// Administração: Desempenho por Turma e por Tutor.
router.get("/indicadores/admin/turmas", ...admin, getDesempenhoTurmas);
router.get("/indicadores/admin/tutores", ...admin, getDesempenhoTutores);

export default router;
