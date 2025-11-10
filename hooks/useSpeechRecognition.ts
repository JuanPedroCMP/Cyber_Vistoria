import { useState, useEffect, useRef, useCallback } from 'react';

// Define uma interface para a instância de SpeechRecognition para fornecer segurança de tipo.
interface SpeechRecognitionInstance {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

// Converte a janela para `any` para acessar APIs não padrão do navegador.
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  
  // Utiliza uma ref para espelhar o estado da transcrição. Isso evita o problema de "stale closure"
  // nos callbacks, garantindo que eles sempre acessem o valor mais recente da transcrição sem
  // precisar adicionar o estado 'transcript' como dependência do useCallback.
  const transcriptRef = useRef('');
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      // O evento 'onend' tratará a atualização do estado isListening.
    }
  }, []);

  const startListening = useCallback(() => {
    if (isListening || !SpeechRecognition) {
      return;
    }

    // CORREÇÃO: Cria uma nova instância de reconhecimento para cada sessão de gravação.
    // Esta é a maneira mais confiável de evitar que os navegadores carreguem
    // resultados de sessões anteriores, o que causa a duplicação do texto.
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;

    // Captura o valor da transcrição no momento em que a gravação começa.
    const baseTranscript = transcriptRef.current;

    recognition.onresult = (event) => {
      // Reconstrói a transcrição de todos os resultados na sessão de reconhecimento atual.
      const sessionTranscript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      // Combina a transcrição base (de antes desta sessão) com a transcrição da nova sessão.
      setTranscript((baseTranscript + ' ' + sessionTranscript).trim());
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        recognitionRef.current = null;
    }
    
    recognition.onend = () => {
        setIsListening(false);
        // Importante: Anula a ref para garantir que a sessão seja considerada encerrada.
        recognitionRef.current = null;
    }

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]); // Depende apenas de 'isListening' para evitar recriação a cada renderização.

  // Efeito de limpeza para desmontagem do componente.
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { isListening, transcript, setTranscript, startListening, stopListening, hasRecognitionSupport: !!SpeechRecognition };
};
