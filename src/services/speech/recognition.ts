import type {
  SpeechPhase,
  SpeechRecognitionConstructor,
  SpeechRecognitionLike,
} from './types';

export const SPEECH_LANG = 'pt-BR';

type SpeechWindow = {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function getSpeechRecognitionConstructor(
  win: SpeechWindow | undefined = typeof window === 'undefined' ? undefined : (window as unknown as SpeechWindow),
): SpeechRecognitionConstructor | null {
  if (!win) return null;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export interface FailureInfo {
  phase: Extract<SpeechPhase, 'no-speech' | 'mic-unavailable' | 'error' | 'cancelled'>;
  message: string;
}

/** Traduz o código de erro da Web Speech API em uma fase e uma mensagem amigável. */
export function mapSpeechError(code: string): FailureInfo {
  switch (code) {
    case 'no-speech':
      return {
        phase: 'no-speech',
        message: 'Não consegui ouvir sua voz. Aproxime o aparelho da boca e tente de novo.',
      };
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        phase: 'mic-unavailable',
        message:
          'O acesso ao microfone foi bloqueado. Permita o microfone para este site nas configurações do navegador e tente de novo.',
      };
    case 'audio-capture':
      return {
        phase: 'mic-unavailable',
        message: 'Nenhum microfone foi encontrado ou ele está sendo usado por outro aplicativo.',
      };
    case 'network':
      return {
        phase: 'error',
        message:
          'O reconhecimento de voz precisa de conexão com a internet na maioria dos navegadores e ela falhou. Você pode continuar digitando normalmente.',
      };
    case 'language-not-supported':
      return {
        phase: 'error',
        message: 'O português do Brasil não está disponível para voz neste navegador.',
      };
    case 'aborted':
      return { phase: 'cancelled', message: 'Captura de voz cancelada.' };
    default:
      return {
        phase: 'error',
        message: 'Ocorreu um erro no reconhecimento de voz. Tente novamente ou digite os produtos.',
      };
  }
}

export interface RecognizerCallbacks {
  onStart: () => void;
  onAudioEnd: () => void;
  /** Texto acumulado até agora (parcial + final). */
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (code: string) => void;
  onEnd: () => void;
}

export interface Recognizer {
  start: () => void;
  /** Encerra a captura e entrega o que foi ouvido. */
  stop: () => void;
  /** Cancela e descarta. */
  abort: () => void;
}

/**
 * Cria um reconhecedor configurado para pt-BR. Retorna null se o navegador não suportar.
 * O áudio não é gravado nem armazenado pelo aplicativo: apenas o texto chega até aqui.
 */
export function createRecognizer(
  callbacks: RecognizerCallbacks,
  Constructor: SpeechRecognitionConstructor | null = getSpeechRecognitionConstructor(),
): Recognizer | null {
  if (!Constructor) return null;

  let recognition: SpeechRecognitionLike;
  try {
    recognition = new Constructor();
  } catch {
    return null;
  }

  recognition.lang = SPEECH_LANG;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => callbacks.onStart();
  recognition.onaudioend = () => callbacks.onAudioEnd();
  recognition.onresult = (event) => {
    let text = '';
    let isFinal = false;
    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.length > 0) text += `${result[0].transcript} `;
      if (result.isFinal) isFinal = true;
    }
    callbacks.onTranscript(text.trim(), isFinal);
  };
  recognition.onerror = (event) => callbacks.onError(event.error);
  recognition.onend = () => callbacks.onEnd();

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}
