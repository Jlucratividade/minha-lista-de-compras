import { deleteDB } from 'idb';
import { DB_NAME, resetDBConnection } from '../services/storage/db';

/** Apaga o banco entre testes para que cada teste comece com uma lista vazia. */
export async function resetDatabase(): Promise<void> {
  await resetDBConnection();
  await deleteDB(DB_NAME);
}
