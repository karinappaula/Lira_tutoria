
import "./config/ambiente";
import { app } from "./app";

const PORT = Number(process.env.PORT ?? 3333);
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`API rodando na porta ${PORT}`);
  console.log("Acesse localmente: http://localhost:" + PORT);
  console.log("Para acesso pela rede, use o IP local desta máquina.");
  console.log(`Teste de conexão com o banco: http://localhost:${PORT}/saude`);
});
