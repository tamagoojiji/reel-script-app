import { useState, useRef, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  value: string;
  onChange: (text: string) => void;
}

export default function VoiceInput({ value, onChange }: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const supportsVoice =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const toggleListening = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const w = window as any;
    const SpeechRecognitionCtor = w.webkitSpeechRecognition || w.SpeechRecognition;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = value;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      onChange(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, value, onChange]);

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-300">音声メモ / テキスト入力</label>
      <textarea
        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500"
        rows={5}
        placeholder="ここに台本のネタやアイデアを入力..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {supportsVoice && (
        <button
          onClick={toggleListening}
          className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
            listening
              ? "bg-red-600 text-white animate-pulse"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {listening ? "🔴 録音中...タップで停止" : "🎤 音声入力"}
        </button>
      )}
      <div className="text-xs text-gray-500 text-right">{value.length} 文字</div>
    </div>
  );
}
