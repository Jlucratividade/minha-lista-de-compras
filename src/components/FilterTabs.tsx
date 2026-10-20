import type { FilterMode } from '../types';

interface FilterTabsProps {
  value: FilterMode;
  onChange: (value: FilterMode) => void;
  counts: { all: number; pending: number; bought: number };
}

const OPTIONS: { value: FilterMode; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'bought', label: 'Comprados' },
];

export function FilterTabs({ value, onChange, counts }: FilterTabsProps) {
  return (
    <div className="filters" role="group" aria-label="Filtrar itens">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`filters__button${value === option.value ? ' is-active' : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label} <span className="filters__count">{counts[option.value]}</span>
        </button>
      ))}
    </div>
  );
}
