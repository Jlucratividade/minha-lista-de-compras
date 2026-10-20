import { useState, type FormEvent } from 'react';
import { parseQuantityField } from '../services/parser';
import type { ItemDraft, ShoppingItem } from '../types';
import { formatQuantityWithUnit } from '../utils/format';
import { MAX_NAME_LENGTH } from '../utils/items';
import { CheckIcon, EditIcon, TrashIcon } from './Icons';

interface ItemRowProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  /** Retorna mensagem de erro ou null em caso de sucesso. */
  onSave: (id: string, draft: ItemDraft) => Promise<string | null>;
}

export function ItemRow({ item, onToggle, onDelete, onSave }: ItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantityText, setQuantityText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bought = item.status === 'bought';
  const quantityLabel = formatQuantityWithUnit(item.quantity, item.unit);

  function startEditing() {
    setName(item.name);
    setQuantityText(formatQuantityWithUnit(item.quantity, item.unit));
    setError(null);
    setEditing(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('O nome não pode ficar vazio.');
      return;
    }
    const parsed = parseQuantityField(quantityText);
    if (!parsed) {
      setError('Não entendi a quantidade. Exemplos: 2, 1,5 kg, 3 pacotes.');
      return;
    }
    const failure = await onSave(item.id, { name, quantity: parsed.quantity, unit: parsed.unit });
    if (failure) setError(failure);
    else setEditing(false);
  }

  if (editing) {
    return (
      <li className="item item--editing">
        <form onSubmit={submit} noValidate aria-label={`Editar ${item.name}`}>
          <div className="field">
            <label htmlFor={`edit-name-${item.id}`}>Nome do produto</label>
            <input
              id={`edit-name-${item.id}`}
              type="text"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              data-autofocus
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor={`edit-qty-${item.id}`}>Quantidade e unidade</label>
            <input
              id={`edit-qty-${item.id}`}
              type="text"
              value={quantityText}
              placeholder="Ex.: 2 litros"
              onChange={(event) => {
                setQuantityText(event.target.value);
                setError(null);
              }}
            />
          </div>
          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="item__edit-actions">
            <button type="button" className="button button--ghost" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button type="submit" className="button button--primary">
              Salvar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`item${bought ? ' item--bought' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={bought}
        aria-label={`${item.name}${quantityLabel ? `, ${quantityLabel}` : ''}`}
        className="item__check"
        onClick={() => onToggle(item.id)}
      >
        <span className="item__box" aria-hidden="true">
          {bought ? <CheckIcon size={20} /> : null}
        </span>
        <span className="item__text">
          <span className="item__name">{item.name}</span>
          {quantityLabel ? <span className="item__qty">{quantityLabel}</span> : null}
        </span>
      </button>
      <div className="item__actions">
        <button
          type="button"
          className="icon-button"
          onClick={startEditing}
          aria-label={`Editar ${item.name}`}
        >
          <EditIcon />
        </button>
        <button
          type="button"
          className="icon-button icon-button--danger"
          onClick={() => onDelete(item.id)}
          aria-label={`Excluir ${item.name}`}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
