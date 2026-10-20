import { useEffect, useMemo } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseShoppingCommand } from '../services/parser';
import type { ItemDraft } from '../types';
import { formatQuantityWithUnit } from '../utils/format';
import { Dialog } from './Dialog';
import { MicIcon } from './Icons';

interface VoiceDialogProps {
  onClose: () => void;
  /** Recebe os itens revisados e confirmados pela pessoa. */
  onConfirm: (items: ItemDraft[]) => Promise<void>;
}

const PHASE_LABEL: Record<string, string> = {
  idle: 'Pronto para ouvir',
  'requesting-permission': 'Solicitando permissão do microfone…',
  listening: 'Ouvindo… fale os produtos',
  processing: 'Processando…',
  confirming: 'Revise o texto reconhecido',
  'no-speech': 'Voz não reconhecida',
  'mic-unavailable': 'Microfone indisponível',
  unsupported: 'Navegador incompatível',
  error: 'Erro de reconhecimento',
  cancelled: 'Operação cancelada',
};

export function VoiceDialog({ onClose, onConfirm }: VoiceDialogProps) {
  const speech = useSpeechRecognition();
  const { phase, transcript, supported } = speech;

  const parsed = useMemo(
    () => (phase === 'confirming' ? parseShoppingCommand(transcript) : null),
    [phase, transcript],
  );

  // Inicia a captura assim que a janela abre (a pessoa já tocou no botão de voz).
  useEffect(() => {
    if (supported) speech.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    speech.reset();
    onClose();
  }

  async function confirm() {
    if (!parsed || parsed.items.length === 0) return;
    await onConfirm(parsed.items);
    close();
  }

  const active = phase === 'requesting-permission' || phase === 'listening' || phase === 'processing';

  return (
    <Dialog title="Adicionar por voz" onClose={close} persistent>
      <p className={`voice-status voice-status--${phase}`} role="status" aria-live="polite">
        {active ? <span className="voice-pulse" aria-hidden="true" /> : <MicIcon size={20} />}
        <span>{PHASE_LABEL[phase]}</span>
      </p>

      {phase === 'listening' || phase === 'requesting-permission' || phase === 'processing' ? (
        <>
          <p className="voice-transcript" aria-live="polite">
            {transcript || 'Exemplo: “dois litros de leite, um quilo de arroz e uma dúzia de ovos”.'}
          </p>
          <div className="dialog__actions">
            <button type="button" className="button button--ghost" onClick={speech.cancel}>
              Cancelar
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={speech.finish}
              disabled={phase !== 'listening'}
              data-autofocus
            >
              Concluir
            </button>
          </div>
        </>
      ) : null}

      {phase === 'confirming' && parsed ? (
        <>
          <div className="field">
            <label htmlFor="voice-text">Texto reconhecido (você pode editar)</label>
            <textarea
              id="voice-text"
              rows={3}
              value={transcript}
              onChange={(event) => speech.setTranscript(event.target.value)}
              data-autofocus
            />
          </div>

          {parsed.warnings.length > 0 ? (
            <ul className="voice-warnings" aria-label="Avisos da interpretação">
              {parsed.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          {parsed.items.length > 0 ? (
            <>
              <h3 className="voice-subtitle">Será adicionado:</h3>
              <ul className="voice-preview">
                {parsed.items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    <strong>{item.name}</strong>
                    {formatQuantityWithUnit(item.quantity, item.unit) ? (
                      <span> — {formatQuantityWithUnit(item.quantity, item.unit)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className="dialog__actions">
            <button type="button" className="button button--ghost" onClick={close}>
              Cancelar
            </button>
            <button type="button" className="button button--ghost" onClick={speech.start}>
              Ouvir de novo
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => void confirm()}
              disabled={parsed.items.length === 0}
            >
              Adicionar à lista
            </button>
          </div>
        </>
      ) : null}

      {phase === 'idle' ? (
        <div className="dialog__actions">
          <button type="button" className="button button--primary" onClick={speech.start} data-autofocus>
            Começar a ouvir
          </button>
        </div>
      ) : null}

      {phase === 'no-speech' || phase === 'mic-unavailable' || phase === 'error' || phase === 'cancelled' ? (
        <>
          {speech.message ? <p className="voice-message">{speech.message}</p> : null}
          <div className="dialog__actions">
            <button type="button" className="button button--ghost" onClick={close} data-autofocus>
              Fechar e digitar
            </button>
            <button type="button" className="button button--primary" onClick={speech.start}>
              Tentar de novo
            </button>
          </div>
        </>
      ) : null}

      {phase === 'unsupported' ? (
        <>
          <p className="voice-message">
            {speech.message ??
              'Este navegador não oferece reconhecimento de voz. Você pode digitar os produtos normalmente.'}
          </p>
          <p className="muted">
            No Android, o Chrome costuma oferecer reconhecimento de voz. Todas as funções de digitação continuam
            disponíveis.
          </p>
          <div className="dialog__actions">
            <button type="button" className="button button--primary" onClick={close} data-autofocus>
              Entendi
            </button>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
