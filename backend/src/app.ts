import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

export const app = express();

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
const origensPermitidas = frontendUrl
  .split(",")
  .map((origem) => origem.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origem, callback) => {
      if (!origem || origensPermitidas.includes(origem)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    maxAge: 600,
  }),
);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use(express.json({ limit: "1mb" }));

app.use(routes);

// Sempre por último: captura erros lançados por qualquer rota acima.
app.use(errorHandler);
