import { existsSync } from "fs";
import path from "path";
import dotenv from "dotenv";

const arquivosEnv = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(process.cwd(), "backend/.env"),
  path.resolve(process.cwd(), ".env"),
];

const arquivoEnv = arquivosEnv.find((caminho) => existsSync(caminho));

if (arquivoEnv) {
  dotenv.config({ path: arquivoEnv });
} else {
  dotenv.config();
}
