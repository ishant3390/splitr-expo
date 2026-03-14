import { Platform } from "react-native";

/**
 * Check if the Web Speech API is available.
 * Currently web-only; native support requires expo-speech-recognition (future).
 */
export function isSpeechRecognitionAvailable(): boolean {
  if (Platform.OS === "web") {
    return (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }
  return false;
}

export interface SpeechRecognitionHandle {
  start: () => void;
  stop: () => void;
}

/**
 * Create a Web Speech API recognition session.
 * Returns null on native or if the browser lacks support.
 */
export function createSpeechRecognition(options: {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
  lang?: string;
}): SpeechRecognitionHandle | null {
  if (Platform.OS !== "web") return null;

  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;

  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = options.lang || "en-US";

  recognition.onresult = (event: any) => {
    const result = event.results[event.results.length - 1];
    options.onResult(result[0].transcript, result.isFinal);
  };
  recognition.onerror = (event: any) => options.onError(event.error);
  recognition.onend = () => options.onEnd();

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}
