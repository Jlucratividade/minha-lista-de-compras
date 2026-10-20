import { isSpeechRecognitionSupported } from '../services/speech/recognition';
import { Dialog } from './Dialog';

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const supported = isSpeechRecognitionSupported();
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  return (
    <Dialog
      title="Configurações e ajuda"
      onClose={onClose}
      footer={
        <button type="button" className="button button--primary" onClick={onClose} data-autofocus>
          Fechar
        </button>
      }
    >
      <section className="settings-section">
        <h3>Comandos de voz</h3>
        <p>Toque em “Adicionar por voz”, fale e revise o texto antes de confirmar. Exemplos:</p>
        <ul>
          <li>“Adicionar leite.”</li>
          <li>“Adicionar dois litros de leite.”</li>
          <li>“Comprar um quilo de arroz.”</li>
          <li>“Uma dúzia de ovos e dois pacotes de café.”</li>
          <li>“Cinco bananas, um pão e três caixas de leite.”</li>
        </ul>
        <p className="muted">
          Estado neste navegador:{' '}
          <strong>{supported ? 'reconhecimento de voz disponível' : 'reconhecimento de voz indisponível'}</strong>.
        </p>
      </section>

      <section className="settings-section">
        <h3>Armazenamento no aparelho</h3>
        <p>
          Sua lista fica salva somente neste aparelho, no armazenamento do navegador (IndexedDB). Não há conta, servidor
          nem rastreamento, e a lista não é sincronizada entre aparelhos. Limpar os dados do site no navegador apaga a
          lista.
        </p>
        <p>O aplicativo não grava nem guarda áudio: apenas o texto reconhecido é usado para montar os itens.</p>
      </section>

      <section className="settings-section">
        <h3>Funcionamento sem internet</h3>
        <p>
          A tela e a lista funcionam sem internet depois da primeira abertura. O reconhecimento de voz é diferente: no
          Chrome do Android ele costuma depender de serviços do navegador e de conexão, então pode não funcionar offline.
          Digitar sempre funciona.
        </p>
        <p className="muted">
          Conexão agora: <strong>{online ? 'online' : 'offline'}</strong>.
        </p>
      </section>

      <section className="settings-section">
        <h3>Sobre</h3>
        <p>Minha Lista de Compras · versão {__APP_VERSION__}</p>
      </section>
    </Dialog>
  );
}
