import { normalizeText } from '../../utils/text';

/**
 * Números por extenso em português (já sem acentos, em minúsculas).
 * Cobre de 0 a 999. Valores maiores não são interpretados (o parser é conservador).
 */
const UNITS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
};

const TENS: Record<string, number> = {
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
};

const HUNDREDS: Record<string, number> = {
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
};

export interface NumberMatch {
  value: number;
  /** Quantidade de tokens consumidos a partir do início. */
  consumed: number;
}

const has = (table: Record<string, number>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(table, key);

/** Unidades de 1 a 9 (usadas depois de dezenas: "vinte e cinco"). */
const isDigitWord = (word: string): boolean => has(UNITS, word) && UNITS[word] >= 1 && UNITS[word] <= 9;

/** Unidades de 0 a 19 (usadas depois de centenas: "cento e dez"). */
const isUnderTwenty = (word: string): boolean => has(UNITS, word) && UNITS[word] < 20;

export function isNumberWord(token: string): boolean {
  const word = normalizeText(token);
  return has(UNITS, word) || has(TENS, word) || has(HUNDREDS, word);
}

/**
 * Indica se o "e" entre dois tokens faz parte de um mesmo número por extenso
 * ("vinte e cinco", "cento e dez") e, portanto, não separa produtos.
 */
export function joinsNumber(previous: string, next: string): boolean {
  const prev = normalizeText(previous);
  const following = normalizeText(next);
  if (has(TENS, prev) && isDigitWord(following)) return true;
  if (prev !== 'cem' && has(HUNDREDS, prev) && (has(TENS, following) || isUnderTwenty(following))) {
    return true;
  }
  return false;
}

/**
 * Lê um número no início da lista de tokens.
 * Aceita algarismos ("2", "10", "1,5", "0.5") e extenso ("vinte e cinco", "cento e dez").
 * Retorna null se o primeiro token não for um número.
 */
export function readNumber(tokens: string[]): NumberMatch | null {
  if (tokens.length === 0) return null;
  const first = normalizeText(tokens[0]);

  if (/^\d+([.,]\d+)?$/.test(first)) {
    const value = Number(first.replace(',', '.'));
    return Number.isFinite(value) ? { value, consumed: 1 } : null;
  }

  if (!isNumberWord(first)) return null;

  const peek = (index: number): string => normalizeText(tokens[index] ?? '');
  let index = 0;
  let total = 0;

  if (has(HUNDREDS, peek(index))) {
    total += HUNDREDS[peek(index)];
    index += 1;
    if (peek(index - 1) === 'cem') return { value: total, consumed: index };

    let next = index;
    if (peek(next) === 'e') next += 1;
    if (!has(TENS, peek(next)) && !isUnderTwenty(peek(next))) {
      return { value: total, consumed: index };
    }
    index = next;
  }

  if (has(TENS, peek(index))) {
    total += TENS[peek(index)];
    index += 1;
    let next = index;
    if (peek(next) === 'e') next += 1;
    if (isDigitWord(peek(next))) {
      total += UNITS[peek(next)];
      index = next + 1;
    }
    return { value: total, consumed: index };
  }

  if (has(UNITS, peek(index))) {
    total += UNITS[peek(index)];
    index += 1;
  }

  return { value: total, consumed: index };
}
