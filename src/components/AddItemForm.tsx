import { useRef, useState, type FormEvent } from 'react';
import { parseQuantityField } from '../services/parser';
import type { ItemDraft } from '../types';
import { MAX_NAME_LENGTH } from '../utils/items';
import { MicIcon, PlusIcon } from './Icons';

interface AddItemFormProps {
  /** Retorna true quando o item foi salvo (o formulário então é limpo). */
  onAdd: (draft: ItemDraft) => Promise<boolean>;
  onVoice: () => void;
  disabled?: boolean;
}

export function AddItemForm({ onAdd, onVoice, disabled }: AddItemFormProps) {
  const [name, setName] = useState('');
  const [quantityText, setQuantityText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (!name.trim()) {
      setError('Digite o nome do produto.');
      nameRef.current?.focus();
      return;
    }
    const parsed = parseQuantityField(quantityText);
    if (!parsed) {
      setError('Não entendi a quantidade. Exemplos: 2, 1,5 kg, 3 pacotes.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const saved = await onAdd({ name, quantity: parsed.quantity, unit: parsed.unit });
      if (saved) {
        setName('');
        setQuantityText('');
        nameRef.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="add-form card" onSubmit={handleSubmit} noValidate aria-label="Adicionar produto">
      <div className="field">
        <label htmlFor="item-name">Produto</label>
        <input
          id="item-name"
          ref={nameRef}
          type="text"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Ex.: Leite"
          autoComplete="off"
          enterKeyHint="done"
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'add-error' : undefined}
          disabled={disabled}
        />
      </div>
      <div className="add-form__row">
        <div className="field field--grow">
          <label htmlFor="item-quantity">Quantidade</label>
          <input
            id="item-quantity"
            type="text"
            value={quantityText}
            placeholder="Opcional: 2 litros"
            autoComplete="off"
            onChange={(event) => {
              setQuantityText(event.target.value);
              if (error) setError(null);
            }}
            disabled={disabled}
          />
        </div>
        <button type="submit" className="button button--primary add-form__submit" disabled={disabled || busy}>
          <PlusIcon />
          <span>Adicionar</span>
        </button>
      </div>
      {error ? (
        <p id="add-error" className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="mic-button" onClick={onVoice} disabled={disabled}>
        <MicIcon size={28} />
        <span>Adicionar por voz</span>
      </button>
    </form>
  );
}
