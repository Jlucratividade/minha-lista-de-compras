import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ShoppingItem } from '../../types';

interface ShoppingDB extends DBSchema {
  items: {
    key: string;
    value: ShoppingItem;
    indexes: { 'by-created': string };
  };
}

export const DB_NAME = 'minha-lista-de-compras';
export const DB_VERSION = 1;

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'StorageError';
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

let dbPromise: Promise<IDBPDatabase<ShoppingDB>> | null = null;

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

export function getDB(): Promise<IDBPDatabase<ShoppingDB>> {
  if (!isStorageAvailable()) {
    return Promise.reject(
      new StorageError(
        'O armazenamento do navegador (IndexedDB) não está disponível. Saia do modo privado ou use outro navegador.',
      ),
    );
  }
  if (!dbPromise) {
    dbPromise = openDB<ShoppingDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('by-created', 'createdAt');
      },
      terminated() {
        dbPromise = null;
      },
    }).catch((error: unknown) => {
      dbPromise = null;
      throw new StorageError(
        'Não foi possível abrir o armazenamento local. Verifique o espaço livre e as permissões do navegador.',
        { cause: error },
      );
    });
  }
  return dbPromise;
}

/** Fecha a conexão e esquece o banco aberto (usado nos testes e ao trocar de banco). */
export async function resetDBConnection(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // nada a fechar
    }
  }
  dbPromise = null;
}
