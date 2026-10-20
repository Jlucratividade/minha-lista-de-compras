/** Formata números no padrão brasileiro: 1.5 → "1,5". */
export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(quantity);
}

/** "2 litros", "3", ou "" quando a quantidade é 1 e não há unidade. */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
  if (!unit && quantity === 1) return '';
  return unit ? `${formatQuantity(quantity)} ${unit}` : formatQuantity(quantity);
}

/** Gera um identificador único. Usa crypto.randomUUID quando disponível. */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
