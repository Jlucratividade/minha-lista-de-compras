import { normalizeText } from '../../utils/text';

interface UnitDefinition {
  singular: string;
  plural: string;
  /** Formas reconhecidas (sem acentos, minúsculas). */
  aliases: string[];
}

/**
 * Unidades reconhecidas. A forma de exibição é sempre a mesma para um mesmo conceito:
 * "quilo", "quilos" e "kg" viram "kg"; "litro" e "litros" viram "litro"/"litros" conforme a quantidade.
 */
const UNIT_DEFINITIONS: UnitDefinition[] = [
  { singular: 'kg', plural: 'kg', aliases: ['kg', 'kgs', 'quilo', 'quilos', 'kilo', 'kilos', 'quilograma', 'quilogramas'] },
  { singular: 'g', plural: 'g', aliases: ['g', 'gr', 'grama', 'gramas'] },
  { singular: 'ml', plural: 'ml', aliases: ['ml', 'mililitro', 'mililitros'] },
  { singular: 'litro', plural: 'litros', aliases: ['l', 'lt', 'lts', 'litro', 'litros'] },
  { singular: 'unidade', plural: 'unidades', aliases: ['un', 'und', 'unid', 'unidade', 'unidades'] },
  { singular: 'pacote', plural: 'pacotes', aliases: ['pct', 'pacote', 'pacotes'] },
  { singular: 'caixa', plural: 'caixas', aliases: ['cx', 'caixa', 'caixas'] },
  { singular: 'garrafa', plural: 'garrafas', aliases: ['garrafa', 'garrafas'] },
  { singular: 'lata', plural: 'latas', aliases: ['lata', 'latas'] },
];

const ALIAS_INDEX: Map<string, UnitDefinition> = new Map();
for (const definition of UNIT_DEFINITIONS) {
  for (const alias of definition.aliases) ALIAS_INDEX.set(alias, definition);
}

/** Retorna true se o token é uma unidade conhecida. */
export function isUnitToken(token: string): boolean {
  return ALIAS_INDEX.has(normalizeText(token).replace(/\.$/, ''));
}

/**
 * Converte um token (ou texto digitado) na forma normalizada da unidade,
 * ajustando singular/plural conforme a quantidade. Desconhecida → devolve o texto limpo.
 */
export function normalizeUnit(token: string, quantity: number): string {
  const key = normalizeText(token).replace(/\.$/, '');
  const definition = ALIAS_INDEX.get(key);
  if (!definition) return token.trim();
  return quantity <= 1 ? definition.singular : definition.plural;
}

/** Normaliza a unidade digitada pela pessoa no formulário. */
export function normalizeTypedUnit(value: string, quantity: number): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return normalizeUnit(trimmed, quantity);
}
