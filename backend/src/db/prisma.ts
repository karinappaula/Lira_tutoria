import { PrismaClient } from "@prisma/client";

// Singleton do Prisma Client — evita abrir múltiplas conexões
// em ambiente de desenvolvimento com hot-reload (ts-node-dev).
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
