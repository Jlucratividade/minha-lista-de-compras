import type { ShoppingItem } from '../../types';
import { getDB, StorageError } from './db';

function wrap(message: string, error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'QuotaExceededError') {
    return new StorageError(
      'O armazenamento do aparelho está cheio. Libere espaço e tente novamente.',
      { cause: error },
    );
  }
  return new StorageError(message, { cause: error });
}

/**
 * Camada de persistência. Cada função só resolve depois que a transação do IndexedDB
 * foi concluída; se houver falha, lança StorageError (e a interface não deve dizer "salvo").
 */
export const itemsRepository = {
  async getAll(): Promise<ShoppingItem[]> {
    try {
      const db = await getDB();
      return await db.getAll('items');
    } catch (error) {
      throw wrap('Não foi possível carregar sua lista salva neste aparelho.', error);
    }
  },

  async putMany(items: ShoppingItem[]): Promise<void> {
    if (items.length === 0) return;
    try {
      const db = await getDB();
      const tx = db.transaction('items', 'readwrite');
      await Promise.all([...items.map((item) => tx.store.put(item)), tx.done]);
    } catch (error) {
      throw wrap('Não foi possível salvar as alterações neste aparelho.', error);
    }
  },

  async put(item: ShoppingItem): Promise<void> {
    await this.putMany([item]);
  },

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
      const db = await getDB();
      const tx = db.transaction('items', 'readwrite');
      await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
    } catch (error) {
      throw wrap('Não foi possível remover os itens do armazenamento deste aparelho.', error);
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear('items');
    } catch (error) {
      throw wrap('Não foi possível limpar a lista salva neste aparelho.', error);
    }
  },
};

export type ItemsRepository = typeof itemsRepository;
