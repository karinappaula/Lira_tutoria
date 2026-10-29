import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

export const app = express();

app.use(cors());
app.use("/ia", express.json({ limit: "1mb" }));
app.use(express.json());

app.use(routes);

// Sempre por último: captura erros lançados por qualquer rota acima.
app.use(errorHandler);
