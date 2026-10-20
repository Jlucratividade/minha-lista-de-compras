import type { ItemDraft } from '../../types';
import { capitalize, collapseSpaces, normalizeText } from '../../utils/text';
import { joinsNumber, readNumber } from './numbers';
import { isUnitToken, normalizeUnit } from './units';

export { normalizeTypedUnit, normalizeUnit, isUnitToken } from './units';
export { readNumber } from './numbers';

export interface ParseResult {
  items: ItemDraft[];
  /** true quando algo não pôde ser interpretado com segurança e a pessoa deve revisar o texto. */
  needsReview: boolean;
  warnings: string[];
}

/** Máximo aceito para a quantidade de um item (evita valores absurdos por erro de reconhecimento). */
export const MAX_QUANTITY = 9999;

/** Expressões de comando removidas do início de cada trecho (comparação sem acentos). */
const COMMAND_PREFIXES: string[] = [
  'colocar na lista de compras',
  'coloque na lista de compras',
  'adicionar na lista de compras',
  'adicionar a lista de compras',
  'colocar na minha lista',
  'adicionar na minha lista',
  'adicionar na lista',
  'adicionar a lista',
  'adicione na lista',
  'adicione a lista',
  'colocar na lista',
  'coloque na lista',
  'coloca na lista',
  'incluir na lista',
  'inclua na lista',
  'eu preciso de',
  'eu preciso comprar',
  'preciso comprar',
  'preciso de',
  'eu quero',
  'adicionar',
  'adicione',
  'adiciona',
  'comprar',
  'compre',
  'compra',
  'colocar',
  'coloque',
  'coloca',
  'incluir',
  'inclua',
  'inclui',
  'anotar',
  'anote',
  'anota',
  'quero',
  'por favor',
]
  .map((phrase) => phrase.split(' '))
  .sort((a, b) => b.length - a.length)
  .map((words) => words.join(' '));

/** Expressões de comando removidas do final de cada trecho. */
const COMMAND_SUFFIXES: string[] = [
  'na lista de compras',
  'para a lista de compras',
  'pra lista de compras',
  'na minha lista',
  'para a lista',
  'pra lista',
  'na lista',
  'a lista',
  'por favor',
  'obrigado',
  'obrigada',
]
  .map((phrase) => phrase.split(' '))
  .sort((a, b) => b.length - a.length)
  .map((words) => words.join(' '));

const CONNECTORS = new Set(['de', 'do', 'da', 'dos', 'das']);

/** Remove pontuação solta das bordas de um token ("leite!" → "leite"). */
function cleanToken(token: string): string {
  return token.replace(/^[\s"'“”‘’(\[]+|[\s"'“”‘’!?)\]:…]+$/g, '');
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map(cleanToken)
    .filter((token) => token.length > 0);
}

/** "2kg" → "2 kg", "500ml" → "500 ml" */
function separateDigitsFromLetters(text: string): string {
  return text.replace(/(\d)([a-zA-ZÀ-ÿ]+)/g, '$1 $2');
}

/** Divide por vírgula (exceto decimal "1,5"), ponto e vírgula, quebra de linha e ponto final. */
function splitSegments(text: string): string[] {
  return text
    .split(/[;\n]+|\.(?=\s|$)|(?<!\d),|,(?!\d)/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

/**
 * Divide uma lista de tokens em vários itens nos "e", exceto quando o "e" faz parte de
 * um número ("vinte e cinco") ou de uma fração ("um quilo e meio").
 */
function splitOnAnd(tokens: string[]): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];

  tokens.forEach((token, index) => {
    if (normalizeText(token) === 'e') {
      const previous = tokens[index - 1];
      const next = tokens[index + 1];
      const nextNormalized = next ? normalizeText(next) : '';
      const keep =
        previous !== undefined &&
        next !== undefined &&
        (joinsNumber(previous, next) || nextNormalized === 'meio' || nextNormalized === 'meia');
      if (keep) {
        current.push(token);
      } else if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      return;
    }
    current.push(token);
  });

  if (current.length > 0) groups.push(current);
  return groups;
}

function startsWithPhrase(tokens: string[], phrase: string): number {
  const words = phrase.split(' ');
  if (tokens.length < words.length) return 0;
  for (let i = 0; i < words.length; i += 1) {
    if (normalizeText(tokens[i]) !== words[i]) return 0;
  }
  return words.length;
}

function endsWithPhrase(tokens: string[], phrase: string): number {
  const words = phrase.split(' ');
  if (tokens.length < words.length) return 0;
  const offset = tokens.length - words.length;
  for (let i = 0; i < words.length; i += 1) {
    if (normalizeText(tokens[offset + i]) !== words[i]) return 0;
  }
  return words.length;
}

function stripCommands(tokensInput: string[]): string[] {
  let tokens = tokensInput;
  let changed = true;
  while (changed && tokens.length > 0) {
    changed = false;
    for (const phrase of COMMAND_PREFIXES) {
      const size = startsWithPhrase(tokens, phrase);
      if (size > 0) {
        tokens = tokens.slice(size);
        changed = true;
        break;
      }
    }
  }
  changed = true;
  while (changed && tokens.length > 0) {
    changed = false;
    for (const phrase of COMMAND_SUFFIXES) {
      const size = endsWithPhrase(tokens, phrase);
      if (size > 0 && size < tokens.length) {
        tokens = tokens.slice(0, tokens.length - size);
        changed = true;
        break;
      }
    }
  }
  return tokens;
}

const isDozen = (token: string): boolean => /^duzias?$/.test(normalizeText(token));
const isHalf = (token: string | undefined): boolean => {
  if (!token) return false;
  const word = normalizeText(token);
  return word === 'meio' || word === 'meia';
};

interface QuantityRead {
  quantity: number;
  unit: string;
  /** Tokens consumidos pela quantidade (e unidade, se houver). */
  consumed: number;
  /** true quando houve unidade ou dúzia, e o próximo "de/do/da" deve ser ignorado. */
  hadUnit: boolean;
}

/** Lê "dois litros", "uma dúzia", "meia dúzia", "meio quilo", "1,5 kg" no início dos tokens. */
function readQuantity(tokens: string[]): QuantityRead | null {
  if (tokens.length === 0) return null;

  // meia dúzia / meio quilo / meio litro
  if (isHalf(tokens[0]) && tokens.length > 1) {
    if (isDozen(tokens[1])) {
      return { quantity: 6, unit: 'unidades', consumed: 2, hadUnit: true };
    }
    if (isUnitToken(tokens[1])) {
      return { quantity: 0.5, unit: normalizeUnit(tokens[1], 0.5), consumed: 2, hadUnit: true };
    }
    return null;
  }

  const number = readNumber(tokens);
  if (!number || number.value <= 0) return null;

  let consumed = number.consumed;
  const next = tokens[consumed];

  if (next !== undefined && isDozen(next)) {
    let quantity = number.value * 12;
    consumed += 1;
    // "uma dúzia e meia" = 18
    if (normalizeText(tokens[consumed] ?? '') === 'e' && isHalf(tokens[consumed + 1])) {
      quantity += 6;
      consumed += 2;
    }
    return { quantity, unit: 'unidades', consumed, hadUnit: true };
  }

  if (next !== undefined && isUnitToken(next)) {
    let quantity = number.value;
    consumed += 1;
    // "um quilo e meio" = 1,5 kg
    if (normalizeText(tokens[consumed] ?? '') === 'e' && isHalf(tokens[consumed + 1])) {
      quantity += 0.5;
      consumed += 2;
    }
    return { quantity, unit: normalizeUnit(next, quantity), consumed, hadUnit: true };
  }

  return { quantity: number.value, unit: '', consumed, hadUnit: false };
}

interface SegmentResult {
  item: ItemDraft | null;
  warnings: string[];
}

function parseSegment(rawTokens: string[]): SegmentResult {
  const tokens = stripCommands(rawTokens);
  const original = collapseSpaces(rawTokens.join(' '));
  if (tokens.length === 0) return { item: null, warnings: [] };

  let quantity = 1;
  let unit = '';
  let rest = tokens;

  const read = readQuantity(tokens);
  if (read) {
    quantity = read.quantity;
    unit = read.unit;
    rest = tokens.slice(read.consumed);
    if (read.hadUnit && rest.length > 0 && CONNECTORS.has(normalizeText(rest[0]))) {
      rest = rest.slice(1);
    }
  }

  const name = collapseSpaces(rest.join(' ')).replace(/[.,;:]+$/, '');
  if (!name) {
    return {
      item: null,
      warnings: [`Faltou o nome do produto em “${original}”.`],
    };
  }

  const warnings: string[] = [];

  if (quantity > MAX_QUANTITY) {
    return {
      item: null,
      warnings: [`A quantidade em “${original}” parece alta demais. Revise o texto.`],
    };
  }

  const nameTokens = tokenize(name);
  if (nameTokens.length > 5) {
    warnings.push(
      `“${name}” é longo e pode conter mais de um produto. Separe os produtos com vírgula ou “e”.`,
    );
  }
  // "leite 2 litros": não sabemos se é nome (embalagem) ou quantidade; mantemos no nome e avisamos.
  for (let i = 0; i < nameTokens.length - 1; i += 1) {
    if (/^\d+([.,]\d+)?$/.test(nameTokens[i]) && isUnitToken(nameTokens[i + 1])) {
      warnings.push(
        `Em “${name}”, não tenho certeza se “${nameTokens[i]} ${nameTokens[i + 1]}” é a quantidade ou parte do nome.`,
      );
      break;
    }
  }

  return {
    item: { name: capitalize(name), quantity, unit },
    warnings,
  };
}

/**
 * Transforma o texto reconhecido (ou digitado) em itens estruturados.
 *
 * É conservador: quando não consegue determinar o nome do produto ou separar os itens
 * com segurança, marca `needsReview` e explica em `warnings`, sem inventar informação.
 */
export function parseShoppingCommand(text: string): ParseResult {
  const prepared = separateDigitsFromLetters(collapseSpaces(text ?? ''));
  if (!prepared) {
    return {
      items: [],
      needsReview: true,
      warnings: ['Não entendi nenhum produto. Tente falar ou escrever novamente.'],
    };
  }

  const items: ItemDraft[] = [];
  const warnings: string[] = [];

  for (const segment of splitSegments(prepared)) {
    const groups = splitOnAnd(tokenize(segment));
    for (const group of groups) {
      const result = parseSegment(group);
      if (result.item) items.push(result.item);
      warnings.push(...result.warnings);
    }
  }

  if (items.length === 0 && warnings.length === 0) {
    warnings.push('Não entendi nenhum produto. Tente falar ou escrever novamente.');
  }

  return { items, needsReview: warnings.length > 0 || items.length === 0, warnings };
}

export interface QuantityField {
  quantity: number;
  unit: string;
}

/**
 * Interpreta o campo opcional "quantidade e unidade" do formulário.
 * Exemplos: "" → 1; "3" → 3; "2 kg" → 2 kg; "1,5 litros"; "dois litros"; "meia dúzia".
 * Retorna null quando o texto não pode ser interpretado.
 */
export function parseQuantityField(text: string): QuantityField | null {
  const prepared = separateDigitsFromLetters(collapseSpaces(text ?? ''));
  if (!prepared) return { quantity: 1, unit: '' };

  const tokens = tokenize(prepared);
  const read = readQuantity(tokens);

  if (read) {
    if (read.quantity > MAX_QUANTITY) return null;
    if (read.consumed === tokens.length) return { quantity: read.quantity, unit: read.unit };
    // Unidade livre digitada pela pessoa (ex.: "3 sacos"), mantida como foi escrita.
    const custom = tokens[read.consumed];
    if (!read.hadUnit && read.consumed === tokens.length - 1 && /^\p{L}{1,20}\.?$/u.test(custom)) {
      return { quantity: read.quantity, unit: custom.replace(/\.$/, '').toLowerCase() };
    }
    return null; // sobrou texto desconhecido
  }

  // Apenas a unidade ("kg", "litros"): quantidade 1
  if (tokens.length === 1 && isUnitToken(tokens[0])) {
    return { quantity: 1, unit: normalizeUnit(tokens[0], 1) };
  }

  return null;
}
