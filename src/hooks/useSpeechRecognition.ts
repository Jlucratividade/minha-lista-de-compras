import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createRecognizer,
  getSpeechRecognitionConstructor,
  mapSpeechError,
  type Recognizer,
} from '../services/speech/recognition';
import type { SpeechPhase } from '../services/speech/types';

export interface SpeechState {
  supported: boolean;
  phase: SpeechPhase;
  /** Texto reconhecido (parcial enquanto ouve, completo ao confirmar). */
  transcript: string;
  message: string | null;
  start: () => void;
  /** Termina a captura e segue para a revisão do texto. */
  finish: () => void;
  /** Cancela a qualquer momento. */
  cancel: () => void;
  /** Volta ao estado inicial. */
  reset: () => void;
  setTranscript: (text: string) => void;
}

export function useSpeechRecognition(): SpeechState {
  const supported = getSpeechRecognitionConstructor() !== null;
  const [phase, setPhase] = useState<SpeechPhase>(supported ? 'idle' : 'unsupported');
  const [transcript, setTranscriptState] = useState('');
  const [message, setMessage] = useState<string | null>(
    supported ? null : 'Este navegador não oferece reconhecimento de voz. Você pode digitar os produtos normalmente.',
  );

  const recognizerRef = useRef<Recognizer | null>(null);
  const transcriptRef = useRef('');
  const cancelledRef = useRef(false);
  const failedRef = useRef(false);
  const activeRef = useRef(false);

  const updateTranscript = useCallback((text: string) => {
    transcriptRef.current = text;
    setTranscriptState(text);
  }, []);

  const teardown = useCallback(() => {
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    activeRef.current = false;
    if (recognizer) {
      try {
        recognizer.abort();
      } catch {
        // já encerrado
      }
    }
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(() => {
    if (!supported) {
      setPhase('unsupported');
      return;
    }
    if (activeRef.current) return;

    cancelledRef.current = false;
    failedRef.current = false;
    updateTranscript('');
    setMessage(null);
    setPhase('requesting-permission');

    const recognizer = createRecognizer({
      onStart: () => setPhase('listening'),
      onAudioEnd: () => {
        if (!cancelledRef.current && !failedRef.current) setPhase('processing');
      },
      onTranscript: (text) => updateTranscript(text),
      onError: (code) => {
        if (cancelledRef.current) return;
        failedRef.current = true;
        const failure = mapSpeechError(code);
        setPhase(failure.phase);
        setMessage(failure.message);
      },
      onEnd: () => {
        activeRef.current = false;
        recognizerRef.current = null;
        if (cancelledRef.current || failedRef.current) return;
        if (transcriptRef.current.trim()) {
          setPhase('confirming');
        } else {
          const failure = mapSpeechError('no-speech');
          setPhase(failure.phase);
          setMessage(failure.message);
        }
      },
    });

    if (!recognizer) {
      setPhase('unsupported');
      setMessage('Não foi possível iniciar o reconhecimento de voz neste navegador.');
      return;
    }

    recognizerRef.current = recognizer;
    activeRef.current = true;
    try {
      recognizer.start();
    } catch {
      activeRef.current = false;
      recognizerRef.current = null;
      failedRef.current = true;
      setPhase('error');
      setMessage('Não foi possível iniciar o microfone agora. Tente novamente em instantes.');
    }
  }, [supported, updateTranscript]);

  const finish = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (!recognizer) return;
    setPhase('processing');
    try {
      recognizer.stop();
    } catch {
      // onEnd decidirá o estado final
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    teardown();
    updateTranscript('');
    setPhase('cancelled');
    setMessage('Captura de voz cancelada.');
  }, [teardown, updateTranscript]);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    teardown();
    updateTranscript('');
    setMessage(supported ? null : 'Este navegador não oferece reconhecimento de voz. Você pode digitar os produtos normalmente.');
    setPhase(supported ? 'idle' : 'unsupported');
  }, [supported, teardown, updateTranscript]);

  return {
    supported,
    phase,
    transcript,
    message,
    start,
    finish,
    cancel,
    reset,
    setTranscript: updateTranscript,
  };
}
