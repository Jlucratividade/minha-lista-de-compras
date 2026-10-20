import type { FilterMode, ItemDraft, ShoppingItem } from '../types';
import { MAX_QUANTITY } from '../services/parser';
import { collapseSpaces, duplicateKey } from './text';
import { createId } from './format';

export const MAX_NAME_LENGTH = 80;

/** Ordem consistente: pendentes primeiro, depois comprados; dentro de cada grupo, por data de criação. */
export function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function filterItems(items: ShoppingItem[], filter: FilterMode): ShoppingItem[] {
  if (filter === 'all') return items;
  const status = filter === 'pending' ? 'pending' : 'bought';
  return items.filter((item) => item.status === status);
}

export function countByStatus(items: ShoppingItem[]): { pending: number; bought: number } {
  let pending = 0;
  let bought = 0;
  for (const item of items) {
    if (item.status === 'pending') pending += 1;
    else bought += 1;
  }
  return { pending, bought };
}

export type DraftValidation =
  | { ok: true; draft: ItemDraft }
  | { ok: false; message: string };

/** Valida e limpa os dados de um item (nome obrigatório, quantidade positiva). */
export function validateDraft(input: ItemDraft): DraftValidation {
  const name = collapseSpaces(input.name ?? '');
  if (!name) return { ok: false, message: 'Digite o nome do produto.' };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `O nome do produto pode ter no máximo ${MAX_NAME_LENGTH} caracteres.` };
  }
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, message: 'A quantidade deve ser maior que zero.' };
  }
  if (quantity > MAX_QUANTITY) {
    return { ok: false, message: `A quantidade deve ser no máximo ${MAX_QUANTITY}.` };
  }
  return {
    ok: true,
    draft: { name, quantity: Math.round(quantity * 100) / 100, unit: collapseSpaces(input.unit ?? '') },
  };
}

export function findByName(
  items: ShoppingItem[],
  name: string,
  ignoreId?: string,
): ShoppingItem | undefined {
  const key = duplicateKey(name);
  return items.find((item) => item.id !== ignoreId && duplicateKey(item.name) === key);
}

export function buildItem(draft: ItemDraft, now: Date = new Date()): ShoppingItem {
  const iso = now.toISOString();
  return {
    id: createId(),
    name: draft.name,
    quantity: draft.quantity,
    unit: draft.unit,
    status: 'pending',
    createdAt: iso,
    updatedAt: iso,
  };
}
