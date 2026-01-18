'use client';

import { useState, useEffect, useRef } from 'react';

// Web Speech API 타입 정의
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // 브라우저 호환성 확인
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('음성 인식이 지원되지 않는 브라우저입니다.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = '';
      switch (event.error) {
        case 'not-allowed':
          errorMessage = '마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
          break;
        case 'no-speech':
          errorMessage = '음성이 감지되지 않았습니다. 다시 말해주세요.';
          break;
        case 'network':
          errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
          break;
        case 'service-not-allowed':
          errorMessage = '음성 인식 서비스가 허용되지 않았습니다.';
          break;
        default:
          errorMessage = `음성 인식 오류: ${event.error}. 마이크 권한을 확인해주세요.`;
      }
      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = async () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError(null);
      
      // 마이크 권한 확인 및 요청
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
          return;
        }
        // 다른 에러는 무시하고 음성 인식 시도
      }

      try {
        recognitionRef.current.start();
      } catch (err: any) {
        if (err.name === 'InvalidStateError') {
          // 이미 실행 중
          return;
        }
        setError('음성 인식을 시작할 수 없습니다. 마이크 권한을 확인해주세요.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setError(null);
  };

  return {
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
