/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  collectCoverageFrom: [
    "src/services/{redacao,correcao}.service.ts",
    "src/controllers/redacao.controller.ts",
    "src/middlewares/auth.middleware.ts",
    "!src/services/auditoria.service.ts",
  ],
  coverageDirectory: "coverage",
};
