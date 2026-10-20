import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceDialog } from './VoiceDialog';
import { mapSpeechError } from '../services/speech/recognition';

/** Web Speech API falsa, controlada pelos testes. */
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onaudioend: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => {
    this.onstart?.();
  });
  stop = vi.fn(() => {
    this.onaudioend?.();
    this.onend?.();
  });
  abort = vi.fn();
  constructor() {
    FakeRecognition.instances.push(this);
  }
  emitResult(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { length: 1, isFinal: true, 0: { transcript: text, confidence: 0.9 } } },
    });
  }
}

const speechWindow = window as unknown as Record<string, unknown>;

beforeEach(() => {
  FakeRecognition.instances = [];
});

afterEach(() => {
  delete speechWindow.webkitSpeechRecognition;
  delete speechWindow.SpeechRecognition;
});

describe('VoiceDialog — navegador incompatível', () => {
  it('exibe o fallback sem quebrar o aplicativo', () => {
    render(<VoiceDialog onClose={() => undefined} onConfirm={async () => undefined} />);
    expect(screen.getAllByText('Navegador incompatível').length).toBeGreaterThan(0);
    expect(screen.getByText(/não oferece reconhecimento de voz/)).toBeInTheDocument();
    expect(screen.getByText(/digitação continuam/)).toBeInTheDocument();
  });
});

describe('VoiceDialog — com reconhecimento de voz', () => {
  beforeEach(() => {
    speechWindow.webkitSpeechRecognition = FakeRecognition;
  });

  it('configura pt-BR, mostra “ouvindo” e permite revisar antes de adicionar', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => undefined);
    render(<VoiceDialog onClose={() => undefined} onConfirm={onConfirm} />);

    const recognition = FakeRecognition.instances[0];
    expect(recognition.lang).toBe('pt-BR');
    expect(await screen.findByText(/Ouvindo/)).toBeInTheDocument();

    act(() => recognition.emitResult('dois litros de leite e uma dúzia de ovos'));
    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(await screen.findByLabelText(/Texto reconhecido/)).toHaveValue('dois litros de leite e uma dúzia de ovos');
    expect(screen.getByText('Leite')).toBeInTheDocument();
    expect(screen.getByText('Ovos')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled(); // nada é adicionado antes da confirmação

    await user.click(screen.getByRole('button', { name: 'Adicionar à lista' }));
    expect(onConfirm).toHaveBeenCalledWith([
      { name: 'Leite', quantity: 2, unit: 'litros' },
      { name: 'Ovos', quantity: 12, unit: 'unidades' },
    ]);
  });

  it('permite editar o texto antes de confirmar', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => undefined);
    render(<VoiceDialog onClose={() => undefined} onConfirm={onConfirm} />);
    const recognition = FakeRecognition.instances[0];
    act(() => recognition.emitResult('leite'));
    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    const textarea = await screen.findByLabelText(/Texto reconhecido/);
    await user.clear(textarea);
    await user.type(textarea, 'três pães');
    await user.click(screen.getByRole('button', { name: 'Adicionar à lista' }));

    expect(onConfirm).toHaveBeenCalledWith([{ name: 'Pães', quantity: 3, unit: '' }]);
  });

  it('permite cancelar a captura', async () => {
    const user = userEvent.setup();
    render(<VoiceDialog onClose={() => undefined} onConfirm={async () => undefined} />);
    await screen.findByText(/Ouvindo/);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getAllByText(/cancelad/i).length).toBeGreaterThan(0);
    expect(FakeRecognition.instances[0].abort).toHaveBeenCalled();
  });

  it('trata erro de permissão do microfone', async () => {
    render(<VoiceDialog onClose={() => undefined} onConfirm={async () => undefined} />);
    const recognition = FakeRecognition.instances[0];
    act(() => recognition.onerror?.({ error: 'not-allowed' }));

    expect(await screen.findAllByText('Microfone indisponível')).not.toHaveLength(0);
    expect(screen.getByText(/bloqueado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar e digitar' })).toBeInTheDocument();
  });

  it('trata erro de rede no reconhecimento', async () => {
    render(<VoiceDialog onClose={() => undefined} onConfirm={async () => undefined} />);
    act(() => FakeRecognition.instances[0].onerror?.({ error: 'network' }));

    expect(await screen.findAllByText('Erro de reconhecimento')).not.toHaveLength(0);
    expect(screen.getByText(/conexão com a internet/)).toBeInTheDocument();
  });

  it('informa “voz não reconhecida” quando nada foi ouvido', async () => {
    const user = userEvent.setup();
    render(<VoiceDialog onClose={() => undefined} onConfirm={async () => undefined} />);
    await screen.findByText(/Ouvindo/);
    await user.click(screen.getByRole('button', { name: 'Concluir' }));

    expect(await screen.findAllByText('Voz não reconhecida')).not.toHaveLength(0);
  });
});

describe('mapSpeechError', () => {
  it('traduz os códigos de erro mais comuns', () => {
    expect(mapSpeechError('no-speech').phase).toBe('no-speech');
    expect(mapSpeechError('not-allowed').phase).toBe('mic-unavailable');
    expect(mapSpeechError('audio-capture').phase).toBe('mic-unavailable');
    expect(mapSpeechError('network').phase).toBe('error');
    expect(mapSpeechError('aborted').phase).toBe('cancelled');
    expect(mapSpeechError('qualquer-coisa').phase).toBe('error');
  });
});
