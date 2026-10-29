import { randomInt } from "node:crypto";

// Sem letras e números que se confundem ao ler na tela (l/1/I, o/0/O)
const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789";

/** Senha aleatória fácil de digitar, no formato xxxx-xxxx-xxxx (~59 bits) */
export function gerarSenha(): string {
  const bloco = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${bloco()}-${bloco()}-${bloco()}`;
}
