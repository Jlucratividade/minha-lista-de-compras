import { useCallback, useRef, useState } from 'react';
import type { ToastKind, ToastMessage } from '../types';

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, text: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, kind, text }]);
      // Erros ficam mais tempo na tela.
      window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 3500);
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}

interface ToastsProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

/** Região acessível: mensagens de sucesso/informação são "status"; erros são "alert". */
export function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div className="toasts">
      <div role="status" aria-live="polite">
        {toasts
          .filter((toast) => toast.kind !== 'error')
          .map((toast) => (
            <div key={toast.id} className={`toast toast--${toast.kind}`}>
              <span>{toast.text}</span>
              <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dispensar mensagem">
                ×
              </button>
            </div>
          ))}
      </div>
      <div role="alert">
        {toasts
          .filter((toast) => toast.kind === 'error')
          .map((toast) => (
            <div key={toast.id} className="toast toast--error">
              <span>{toast.text}</span>
              <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dispensar mensagem">
                ×
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
