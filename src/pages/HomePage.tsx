import { useMemo, useState } from 'react';
import { AddItemForm } from '../components/AddItemForm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FilterTabs } from '../components/FilterTabs';
import { BasketIcon, CartCheckIcon, SettingsIcon, TrashIcon } from '../components/Icons';
import { ItemRow } from '../components/ItemRow';
import { SettingsDialog } from '../components/SettingsDialog';
import { Toasts, useToasts } from '../components/Toasts';
import { VoiceDialog } from '../components/VoiceDialog';
import { useShoppingList } from '../hooks/useShoppingList';
import type { ItemsRepository } from '../services/storage/itemsRepository';
import type { FilterMode, ItemDraft } from '../types';
import { countByStatus, filterItems } from '../utils/items';

type DialogState = null | 'voice' | 'settings' | 'clear' | 'remove-bought' | { deleteId: string };

interface HomePageProps {
  repository?: ItemsRepository;
}

const EMPTY_MESSAGES: Record<FilterMode, string> = {
  all: 'Sua lista está vazia. Digite um produto ou toque em “Adicionar por voz”.',
  pending: 'Nenhum item pendente. Tudo comprado!',
  bought: 'Nenhum item comprado ainda.',
};

export function HomePage({ repository }: HomePageProps) {
  const list = useShoppingList(repository);
  const { toasts, push, dismiss } = useToasts();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => countByStatus(list.items), [list.items]);
  const visible = useMemo(() => filterItems(list.items, filter), [list.items, filter]);
  const deleteTarget =
    dialog && typeof dialog === 'object' ? list.items.find((item) => item.id === dialog.deleteId) : undefined;

  async function handleAdd(draft: ItemDraft): Promise<boolean> {
    const outcome = await list.addItem(draft);
    switch (outcome.kind) {
      case 'added':
        push('success', `“${outcome.item.name}” adicionado à lista.`);
        return true;
      case 'reactivated':
        push('success', `“${outcome.item.name}” voltou para os pendentes.`);
        return true;
      case 'duplicate':
        push('info', `“${outcome.item.name}” já está na lista.`);
        return false;
      case 'invalid':
      case 'error':
        push('error', outcome.message);
        return false;
    }
  }

  async function handleVoiceConfirm(items: ItemDraft[]) {
    const summary = await list.addMany(items);
    const parts: string[] = [];
    const total = summary.added + summary.reactivated;
    if (total > 0) parts.push(`${total} ${total === 1 ? 'item adicionado' : 'itens adicionados'}`);
    if (summary.duplicates > 0) {
      parts.push(`${summary.duplicates} já ${summary.duplicates === 1 ? 'estava' : 'estavam'} na lista`);
    }
    if (summary.invalid > 0) parts.push(`${summary.invalid} ignorado(s) por dados inválidos`);
    if (summary.failed > 0) {
      push('error', summary.errorMessage ?? 'Não foi possível salvar alguns itens.');
    }
    if (parts.length > 0) push(total > 0 ? 'success' : 'info', `${parts.join('; ')}.`);
  }

  async function handleSave(id: string, draft: ItemDraft): Promise<string | null> {
    const result = await list.updateItem(id, draft);
    if (result.ok) {
      push('success', 'Item atualizado.');
      return null;
    }
    return result.message;
  }

  async function handleToggle(id: string) {
    const result = await list.toggleItem(id);
    if (!result.ok) push('error', result.message);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const result = await list.removeItem(deleteTarget.id);
    setBusy(false);
    setDialog(null);
    if (result.ok) push('success', `“${deleteTarget.name}” excluído.`);
    else push('error', result.message);
  }

  async function confirmRemoveBought() {
    setBusy(true);
    const result = await list.removeBought();
    setBusy(false);
    setDialog(null);
    if (result.ok) {
      push('success', `${result.removed ?? 0} ${result.removed === 1 ? 'item comprado removido' : 'itens comprados removidos'}.`);
    } else push('error', result.message);
  }

  async function confirmClear() {
    setBusy(true);
    const result = await list.clearAll();
    setBusy(false);
    setDialog(null);
    if (result.ok) push('success', 'Lista limpa.');
    else push('error', result.message);
  }

  const blocked = list.status !== 'ready';

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__title">
          <span className="app-header__logo">
            <BasketIcon size={26} />
          </span>
          <h1>Minha Lista de Compras</h1>
        </div>
        <button
          type="button"
          className="icon-button icon-button--light"
          onClick={() => setDialog('settings')}
          aria-label="Configurações e ajuda"
        >
          <SettingsIcon />
        </button>
      </header>

      <main className="app-main">
        <p className="summary" aria-live="polite">
          <span className="summary__pill">
            <strong>{counts.pending}</strong> {counts.pending === 1 ? 'pendente' : 'pendentes'}
          </span>
          <span className="summary__pill summary__pill--done">
            <strong>{counts.bought}</strong> {counts.bought === 1 ? 'comprado' : 'comprados'}
          </span>
        </p>

        <AddItemForm onAdd={handleAdd} onVoice={() => setDialog('voice')} disabled={blocked} />

        {list.status === 'error' ? (
          <div className="card card--error" role="alert">
            <p>{list.loadError}</p>
            <button type="button" className="button button--primary" onClick={() => void list.reload()}>
              Tentar de novo
            </button>
          </div>
        ) : null}

        {list.status === 'loading' ? (
          <p className="muted center" role="status">
            Carregando sua lista…
          </p>
        ) : null}

        {list.status === 'ready' ? (
          <section aria-label="Lista de produtos" className="list-section">
            <FilterTabs
              value={filter}
              onChange={setFilter}
              counts={{ all: list.items.length, pending: counts.pending, bought: counts.bought }}
            />

            {visible.length === 0 ? (
              <div className="empty">
                <CartCheckIcon size={48} />
                <p>{EMPTY_MESSAGES[filter]}</p>
              </div>
            ) : (
              <ul className="items">
                {visible.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={(id) => void handleToggle(id)}
                    onDelete={(id) => setDialog({ deleteId: id })}
                    onSave={handleSave}
                  />
                ))}
              </ul>
            )}

            <div className="bulk-actions">
              <button
                type="button"
                className="button button--outline"
                onClick={() => setDialog('remove-bought')}
                disabled={counts.bought === 0}
              >
                <CartCheckIcon size={20} />
                Remover comprados
              </button>
              <button
                type="button"
                className="button button--outline button--outline-danger"
                onClick={() => setDialog('clear')}
                disabled={list.items.length === 0}
              >
                <TrashIcon size={20} />
                Limpar lista
              </button>
            </div>
          </section>
        ) : null}
      </main>

      {dialog === 'voice' ? <VoiceDialog onClose={() => setDialog(null)} onConfirm={handleVoiceConfirm} /> : null}
      {dialog === 'settings' ? <SettingsDialog onClose={() => setDialog(null)} /> : null}
      {dialog === 'clear' ? (
        <ConfirmDialog
          title="Limpar a lista?"
          message={`Isso apagará todos os ${list.items.length} itens da lista. Esta ação não pode ser desfeita.`}
          confirmLabel="Limpar tudo"
          busy={busy}
          onConfirm={() => void confirmClear()}
          onCancel={() => setDialog(null)}
        />
      ) : null}
      {dialog === 'remove-bought' ? (
        <ConfirmDialog
          title="Remover itens comprados?"
          message={`${counts.bought} ${counts.bought === 1 ? 'item comprado será removido' : 'itens comprados serão removidos'} da lista.`}
          confirmLabel="Remover"
          busy={busy}
          onConfirm={() => void confirmRemoveBought()}
          onCancel={() => setDialog(null)}
        />
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title="Excluir item?"
          message={`“${deleteTarget.name}” será removido da lista.`}
          confirmLabel="Excluir"
          busy={busy}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDialog(null)}
        />
      ) : null}

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
