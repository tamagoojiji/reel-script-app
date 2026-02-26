import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import VoiceInput from "../components/VoiceInput";
import { generateQuestions, generateEmpathyScript, syncSaveHistory } from "../api/gasApi";
import { getGasUrl } from "../config";
import type { GasQuestion, HistoryItem, TargetPlatform, GeneratedScript } from "../types";

interface LocationState {
  transcript: string;
  targets: TargetPlatform[];
}

export default function QuestionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [questions, setQuestions] = useState<GasQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state) {
      navigate("/create");
      return;
    }

    const fetchQuestions = async () => {
      try {
        const res = await generateQuestions(state.transcript, state.targets);
        if (res.questions) {
          setQuestions(res.questions);
          setAnswers(res.questions.map(() => ""));
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = answers.every((a) => a.trim().length > 0) && !loadingGenerate;

  const handleGenerate = async () => {
    if (!state) return;
    setLoadingGenerate(true);
    setError("");

    try {
      const answersPayload = questions.map((q, i) => ({
        question: q.question,
        answer: answers[i],
      }));

      const res = await generateEmpathyScript(state.transcript, state.targets, answersPayload);
      if (res.script && res.yaml) {
        const id = saveToHistory(res.script, res.yaml, state.transcript, state.targets);
        navigate("/create/result/" + id);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingGenerate(false);
    }
  };

  if (loadingQuestions) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center pt-20 space-y-4">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">質問を生成中...</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/create")} className="text-indigo-400 text-sm">
          ← 戻る
        </button>
        <h1 className="text-lg font-bold">感情を引き出す質問</h1>
        <div className="w-10" />
      </div>

      <p className="text-xs text-gray-500">
        以下の質問に音声またはテキストで回答してください。回答が台本の感情パートに反映されます。
      </p>

      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-white font-bold">Q{i + 1}. {q.question}</p>
            <p className="text-xs text-gray-500 mt-1">{q.purpose}</p>
          </div>
          <VoiceInput value={answers[i]} onChange={(v) => {
            const next = [...answers];
            next[i] = v;
            setAnswers(next);
          }} />
        </div>
      ))}

      {error && (
        <div className="bg-red-900/30 border border-red-700/40 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canSubmit}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
          canSubmit
            ? "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700"
            : "bg-gray-700 text-gray-500 cursor-not-allowed"
        }`}
      >
        {loadingGenerate ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            台本を生成中...（30秒ほどかかります）
          </span>
        ) : (
          "台本を生成する"
        )}
      </button>
    </div>
  );
}

function saveToHistory(
  script: GeneratedScript,
  yaml: string,
  transcript: string,
  targets: TargetPlatform[]
): string {
  const key = "script-creator-history";
  const history = JSON.parse(localStorage.getItem(key) || "[]");
  const id = Date.now().toString();
  history.unshift({
    id,
    title: script.title,
    template: "empathy",
    transcript,
    targets,
    script,
    yaml,
    createdAt: new Date().toISOString(),
  });
  if (history.length > 20) history.length = 20;
  localStorage.setItem(key, JSON.stringify(history));

  if (getGasUrl()) {
    syncSaveHistory(history as HistoryItem[]).catch(() => {});
  }

  return id;
}
