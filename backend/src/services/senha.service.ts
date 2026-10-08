import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// Transforma a senha em texto puro num hash seguro (nunca guardamos a senha em si).
export async function gerarHashSenha(senhaTextoPuro: string): Promise<string> {
  return bcrypt.hash(senhaTextoPuro, SALT_ROUNDS);
}

// Compara a senha digitada no login com o hash salvo no banco.
export async function conferirSenha(
  senhaTextoPuro: string,
  hashSalvo: string
): Promise<boolean> {
  return bcrypt.compare(senhaTextoPuro, hashSalvo);
}