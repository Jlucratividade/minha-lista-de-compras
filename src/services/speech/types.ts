/**
 * Tipos mínimos da Web Speech API (o TypeScript não inclui todos eles).
 * A API é prefixada (webkitSpeechRecognition) no Chrome/Android.
 */
export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultLike {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onaudioend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/** Fases da interface de voz. */
export type SpeechPhase =
  | 'idle' // pronto para ouvir
  | 'requesting-permission' // solicitando permissão do microfone
  | 'listening' // ouvindo
  | 'processing' // processando o áudio capturado
  | 'confirming' // aguardando confirmação do texto reconhecido
  | 'no-speech' // voz não reconhecida
  | 'mic-unavailable' // microfone indisponível ou bloqueado
  | 'unsupported' // navegador incompatível
  | 'error' // erro de reconhecimento
  | 'cancelled'; // operação cancelada
