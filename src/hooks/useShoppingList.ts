import { useCallback, useEffect, useRef, useState } from 'react';
import type { ItemDraft, ShoppingItem } from '../types';
import { itemsRepository, type ItemsRepository } from '../services/storage/itemsRepository';
import { buildItem, findByName, sortItems, validateDraft } from '../utils/items';

export type LoadStatus = 'loading' | 'ready' | 'error';

export type AddOutcome =
  | { kind: 'added'; item: ShoppingItem }
  | { kind: 'reactivated'; item: ShoppingItem }
  | { kind: 'duplicate'; item: ShoppingItem }
  | { kind: 'invalid'; message: string }
  | { kind: 'error'; message: string };

export type MutationOutcome = { ok: true } | { ok: false; message: string };

export interface AddManySummary {
  added: number;
  reactivated: number;
  duplicates: number;
  invalid: number;
  failed: number;
  errorMessage?: string;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao salvar.';
}

/**
 * Estado da lista de compras. Toda alteração só aparece na tela depois que o
 * armazenamento local confirmou a gravação (nada é dado como salvo sem confirmação).
 */
export function useShoppingList(repository: ItemsRepository = itemsRepository) {
  const [items, setItemsState] = useState<ShoppingItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const itemsRef = useRef<ShoppingItem[]>([]);
  // Fila simples: garante que operações seguidas (ex.: vários itens por voz) não se sobreponham.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  const commit = useCallback((next: ShoppingItem[]) => {
    const sorted = sortItems(next);
    itemsRef.current = sorted;
    setItemsState(sorted);
  }, []);

  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.catch(() => undefined);
    return run;
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      const stored = await repository.getAll();
      commit(stored);
      setStatus('ready');
    } catch (error) {
      setLoadError(errorText(error));
      setStatus('error');
    }
  }, [repository, commit]);

  useEffect(() => {
    void load();
  }, [load]);

  const addOne = useCallback(
    async (input: ItemDraft): Promise<AddOutcome> => {
      const validation = validateDraft(input);
      if (!validation.ok) return { kind: 'invalid', message: validation.message };
      const { draft } = validation;

      const existing = findByName(itemsRef.current, draft.name);
      try {
        if (existing && existing.status === 'pending') {
          return { kind: 'duplicate', item: existing };
        }
        if (existing && existing.status === 'bought') {
          const reactivated: ShoppingItem = {
            ...existing,
            quantity: draft.quantity,
            unit: draft.unit,
            status: 'pending',
            updatedAt: new Date().toISOString(),
          };
          await repository.put(reactivated);
          commit(itemsRef.current.map((item) => (item.id === existing.id ? reactivated : item)));
          return { kind: 'reactivated', item: reactivated };
        }
        const created = buildItem(draft);
        await repository.put(created);
        commit([...itemsRef.current, created]);
        return { kind: 'added', item: created };
      } catch (error) {
        return { kind: 'error', message: errorText(error) };
      }
    },
    [repository, commit],
  );

  const addItem = useCallback((input: ItemDraft) => enqueue(() => addOne(input)), [enqueue, addOne]);

  const addMany = useCallback(
    (inputs: ItemDraft[]): Promise<AddManySummary> =>
      enqueue(async () => {
        const summary: AddManySummary = {
          added: 0,
          reactivated: 0,
          duplicates: 0,
          invalid: 0,
          failed: 0,
        };
        for (const input of inputs) {
          const outcome = await addOne(input);
          switch (outcome.kind) {
            case 'added':
              summary.added += 1;
              break;
            case 'reactivated':
              summary.reactivated += 1;
              break;
            case 'duplicate':
              summary.duplicates += 1;
              break;
            case 'invalid':
              summary.invalid += 1;
              break;
            case 'error':
              summary.failed += 1;
              summary.errorMessage = outcome.message;
              break;
          }
        }
        return summary;
      }),
    [enqueue, addOne],
  );

  const toggleItem = useCallback(
    (id: string): Promise<MutationOutcome> =>
      enqueue(async () => {
        const current = itemsRef.current.find((item) => item.id === id);
        if (!current) return { ok: false, message: 'Item não encontrado.' } as const;
        const updated: ShoppingItem = {
          ...current,
          status: current.status === 'pending' ? 'bought' : 'pending',
          updatedAt: new Date().toISOString(),
        };
        try {
          await repository.put(updated);
          commit(itemsRef.current.map((item) => (item.id === id ? updated : item)));
          return { ok: true } as const;
        } catch (error) {
          return { ok: false, message: errorText(error) } as const;
        }
      }),
    [enqueue, repository, commit],
  );

  const updateItem = useCallback(
    (id: string, input: ItemDraft): Promise<MutationOutcome> =>
      enqueue(async () => {
        const current = itemsRef.current.find((item) => item.id === id);
        if (!current) return { ok: false, message: 'Item não encontrado.' } as const;
        const validation = validateDraft(input);
        if (!validation.ok) return { ok: false, message: validation.message } as const;
        const { draft } = validation;
        const clash = findByName(itemsRef.current, draft.name, id);
        if (clash) {
          return { ok: false, message: `“${clash.name}” já está na lista.` } as const;
        }
        const updated: ShoppingItem = {
          ...current,
          name: draft.name,
          quantity: draft.quantity,
          unit: draft.unit,
          updatedAt: new Date().toISOString(),
        };
        try {
          await repository.put(updated);
          commit(itemsRef.current.map((item) => (item.id === id ? updated : item)));
          return { ok: true } as const;
        } catch (error) {
          return { ok: false, message: errorText(error) } as const;
        }
      }),
    [enqueue, repository, commit],
  );

  const removeItem = useCallback(
    (id: string): Promise<MutationOutcome> =>
      enqueue(async () => {
        try {
          await repository.deleteMany([id]);
          commit(itemsRef.current.filter((item) => item.id !== id));
          return { ok: true } as const;
        } catch (error) {
          return { ok: false, message: errorText(error) } as const;
        }
      }),
    [enqueue, repository, commit],
  );

  const removeBought = useCallback(
    (): Promise<MutationOutcome & { removed?: number }> =>
      enqueue(async () => {
        const ids = itemsRef.current.filter((item) => item.status === 'bought').map((item) => item.id);
        try {
          await repository.deleteMany(ids);
          commit(itemsRef.current.filter((item) => item.status !== 'bought'));
          return { ok: true, removed: ids.length } as const;
        } catch (error) {
          return { ok: false, message: errorText(error) } as const;
        }
      }),
    [enqueue, repository, commit],
  );

  const clearAll = useCallback(
    (): Promise<MutationOutcome> =>
      enqueue(async () => {
        try {
          await repository.clear();
          commit([]);
          return { ok: true } as const;
        } catch (error) {
          return { ok: false, message: errorText(error) } as const;
        }
      }),
    [enqueue, repository, commit],
  );

  return {
    items,
    status,
    loadError,
    reload: load,
    addItem,
    addMany,
    toggleItem,
    updateItem,
    removeItem,
    removeBought,
    clearAll,
  };
}
