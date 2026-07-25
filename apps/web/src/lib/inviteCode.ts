import { randomInt } from 'node:crypto';

// Alfabeto sin caracteres ambiguos (0/O, 1/I/L) para códigos fáciles de dictar.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Genera un código de invitación de 8 caracteres (equivalente a nanoid(8)). */
export function generateInviteCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
