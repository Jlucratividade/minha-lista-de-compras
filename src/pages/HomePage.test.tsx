import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { HomePage } from './HomePage';
import { itemsRepository } from '../services/storage/itemsRepository';
import { resetDatabase } from '../test/helpers';
import { buildItem } from '../utils/items';

async function renderPage() {
  const view = render(<HomePage />);
  await screen.findByRole('group', { name: 'Filtrar itens' });
  return view;
}

async function addByTyping(user: ReturnType<typeof userEvent.setup>, name: string, quantity = '') {
  await user.type(screen.getByLabelText('Produto'), name);
  if (quantity) await user.type(screen.getByLabelText(/Quantidade/), quantity);
  await user.click(screen.getByRole('button', { name: 'Adicionar' }));
}

beforeEach(async () => {
  await resetDatabase();
});

describe('Lista de compras', () => {
  it('mostra mensagem amigável quando a lista está vazia', async () => {
    await renderPage();
    expect(screen.getByText(/Sua lista está vazia/)).toBeInTheDocument();
  });

  it('adiciona um produto digitando', async () => {
    const user = userEvent.setup();
    await renderPage();
    await addByTyping(user, 'Leite', '2 litros');

    expect(await screen.findByRole('checkbox', { name: 'Leite, 2 litros' })).toBeInTheDocument();
    expect(await screen.findByText('“Leite” adicionado à lista.')).toBeInTheDocument();
    expect(screen.getByLabelText('Produto')).toHaveValue('');
    expect(await itemsRepository.getAll()).toHaveLength(1);
  });

  it('impede a inclusão de produto sem nome', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByText('Digite o nome do produto.')).toBeInTheDocument();
    expect(await itemsRepository.getAll()).toHaveLength(0);
  });

  it('evita duplicação acidental', async () => {
    const user = userEvent.setup();
    await renderPage();
    await addByTyping(user, 'Arroz');
    await screen.findByRole('checkbox', { name: 'Arroz' });
    await addByTyping(user, 'arroz');

    expect(await screen.findByText('“Arroz” já está na lista.')).toBeInTheDocument();
    expect(await itemsRepository.getAll()).toHaveLength(1);
  });

  it('marca um produto como comprado e atualiza os contadores', async () => {
    const user = userEvent.setup();
    await renderPage();
    await addByTyping(user, 'Pão');
    const checkbox = await screen.findByRole('checkbox', { name: 'Pão' });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    await user.click(checkbox);

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Pão' })).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByText('comprado')).toBeInTheDocument();
    const [stored] = await itemsRepository.getAll();
    expect(stored.status).toBe('bought');
  });

  it('edita um produto', async () => {
    const user = userEvent.setup();
    await renderPage();
    await addByTyping(user, 'Leite');
    await screen.findByRole('checkbox', { name: 'Leite' });

    await user.click(screen.getByRole('button', { name: 'Editar Leite' }));
    const nameInput = screen.getByLabelText('Nome do produto');
    await user.clear(nameInput);
    await user.type(nameInput, 'Leite integral');
    const qtyInput = screen.getByLabelText('Quantidade e unidade');
    await user.clear(qtyInput);
    await user.type(qtyInput, '3 caixas');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('checkbox', { name: 'Leite integral, 3 caixas' })).toBeInTheDocument();
    const [stored] = await itemsRepository.getAll();
    expect(stored).toMatchObject({ name: 'Leite integral', quantity: 3, unit: 'caixas' });
  });

  it('exclui um produto após confirmação', async () => {
    const user = userEvent.setup();
    await renderPage();
    await addByTyping(user, 'Café');
    await screen.findByRole('checkbox', { name: 'Café' });

    await user.click(screen.getByRole('button', { name: 'Excluir Café' }));
    const dialog = await screen.findByRole('dialog', { name: 'Excluir item?' });
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Café' })).not.toBeInTheDocument());
    expect(await itemsRepository.getAll()).toHaveLength(0);
  });

  it('remove itens comprados e limpa a lista com confirmação', async () => {
    const user = userEvent.setup();
    await renderPage();
    await addByTyping(user, 'Sal');
    await user.click(await screen.findByRole('checkbox', { name: 'Sal' }));
    await addByTyping(user, 'Óleo');
    await screen.findByRole('checkbox', { name: 'Óleo' });

    await user.click(screen.getByRole('button', { name: /Remover comprados/ }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Sal' })).not.toBeInTheDocument());
    expect(screen.getByRole('checkbox', { name: 'Óleo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Limpar lista/ }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Limpar tudo' }));
    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument());
    expect(await itemsRepository.getAll()).toHaveLength(0);
  });

  it('filtra pendentes e comprados', async () => {
    const user = userEvent.setup();
    await renderPage();
    await addByTyping(user, 'Sal');
    await user.click(await screen.findByRole('checkbox', { name: 'Sal' }));
    await addByTyping(user, 'Óleo');
    await screen.findByRole('checkbox', { name: 'Óleo' });

    await user.click(screen.getByRole('button', { name: /Pendentes/ }));
    expect(screen.queryByRole('checkbox', { name: 'Sal' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Óleo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Comprados/ }));
    expect(screen.getByRole('checkbox', { name: 'Sal' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Óleo' })).not.toBeInTheDocument();
  });

  it('restaura a lista a partir do armazenamento ao reabrir', async () => {
    await itemsRepository.putMany([
      buildItem({ name: 'Feijão', quantity: 2, unit: 'kg' }, new Date('2026-01-01T10:00:00Z')),
      { ...buildItem({ name: 'Macarrão', quantity: 1, unit: 'pacote' }, new Date('2026-01-01T11:00:00Z')), status: 'bought' },
    ]);

    await renderPage();

    expect(await screen.findByRole('checkbox', { name: 'Feijão, 2 kg' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Macarrão, 1 pacote' })).toHaveAttribute('aria-checked', 'true');
  });

  it('mostra erro claro (e não "salvo") quando o armazenamento falha', async () => {
    const user = userEvent.setup();
    const failing = {
      getAll: async () => [],
      put: async () => {
        throw new Error('Não foi possível salvar as alterações neste aparelho.');
      },
      putMany: async () => {
        throw new Error('falha');
      },
      deleteMany: async () => undefined,
      clear: async () => undefined,
    };
    render(<HomePage repository={failing as never} />);
    await screen.findByRole('group', { name: 'Filtrar itens' });

    await addByTyping(user, 'Leite');

    expect(await screen.findByText('Não foi possível salvar as alterações neste aparelho.')).toBeInTheDocument();
    expect(screen.queryByText('“Leite” adicionado à lista.')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Leite' })).not.toBeInTheDocument();
  });
});
