import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registra o Service Worker e mostra um aviso quando há uma versão nova ou quando
 * o app ficou pronto para uso offline. A atualização só é aplicada quando a pessoa toca em "Atualizar".
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn('Service Worker não pôde ser registrado:', error);
    },
  });

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span>
        {needRefresh
          ? 'Há uma nova versão do aplicativo.'
          : 'Pronto: a tela do aplicativo já funciona sem internet.'}
      </span>
      <div className="update-banner__actions">
        {needRefresh ? (
          <button type="button" className="button button--primary" onClick={() => void updateServiceWorker(true)}>
            Atualizar
          </button>
        ) : null}
        <button
          type="button"
          className="button button--ghost"
          onClick={() => {
            setNeedRefresh(false);
            setOfflineReady(false);
          }}
        >
          {needRefresh ? 'Depois' : 'Ok'}
        </button>
      </div>
    </div>
  );
}
