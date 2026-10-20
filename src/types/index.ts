export type ItemStatus = 'pending' | 'bought';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  /** Unidade normalizada (ex.: "kg", "litros"). Vazia quando não informada. */
  unit: string;
  status: ItemStatus;
  /** Data ISO 8601 */
  createdAt: string;
  /** Data ISO 8601 */
  updatedAt: string;
}

/** Item ainda sem identificador, vindo do formulário ou do interpretador de voz. */
export interface ItemDraft {
  name: string;
  quantity: number;
  unit: string;
}

export type FilterMode = 'all' | 'pending' | 'bought';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}
