import "dotenv/config";
import { app } from "./app";

const PORT = process.env.PORT ?? 3333;

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
  console.log(`Teste de conexão com o banco: http://localhost:${PORT}/health`);
});
