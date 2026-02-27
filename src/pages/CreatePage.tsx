import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VoiceInput from "../components/VoiceInput";
import TemplateSelector from "../components/TemplateSelector";
import TargetCheckbox from "../components/TargetCheckbox";
import { generateScript, syncSaveHistory } from "../api/gasApi";
import { getGasUrl } from "../config";
import type { HistoryItem, TemplateType, TargetPlatform, GeneratedScript } from "../types";
import { TEMPLATE_INFO } from "../types";

const MEMO_KEY = "reel-create-memo";

export default function CreatePage() {
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState(() => localStorage.getItem(MEMO_KEY) || "");
  const [template, setTemplate] = useState<TemplateType>("prep");
  const [targets, setTargets] = useState<TargetPlatform[]>(["リール"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);
  const [lastResultId, setLastResultId] = useState("");
  const [lastTemplate, setLastTemplate] = useState<TemplateType | "">("");

  // 入力が変わるたびにlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(MEMO_KEY, transcript);
  }, [transcript]);

  const canSubmit = transcript.trim().length > 0 && !loading;

  const handleGenerate = async () => {
    if (!getGasUrl()) {
      setError("GAS URLが未設定です。設定画面からURLを入力してください。");
      return;
    }

    // EMPATHY型は質問ページへ遷移
    if (template === "empathy") {
      navigate("/create/questions", { state: { transcript, targets } });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await generateScript(transcript, template, targets);
      if (res.script && res.yaml) {
        const id = saveToHistory(res.script, res.yaml, transcript, template, targets);
        setGenerated(true);
        setLastResultId(id);
        setLastTemplate(template);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-24 space-y-5">
      <h1 className="text-xl font-bold">台本を作成</h1>

      <TargetCheckbox value={targets} onChange={setTargets} />
      <TemplateSelector value={template} onChange={setTemplate} />
      <VoiceInput value={transcript} onChange={setTranscript} />

      {error && (
        <div className="bg-red-900/30 border border-red-700/40 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {generated && lastResultId && (
        <div className="bg-green-900/30 border border-green-700/40 rounded-lg p-3 space-y-2">
          <p className="text-sm text-green-300">
            {lastTemplate ? TEMPLATE_INFO[lastTemplate as TemplateType]?.name : ""} で生成完了
          </p>
          <button
            onClick={() => navigate("/create/result/" + lastResultId)}
            className="w-full py-2 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg text-sm"
          >
            結果を見る
          </button>
          <p className="text-xs text-gray-400 text-center">
            テンプレートを変えて再生成できます
          </p>
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
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            生成中...（30秒ほどかかります）
          </span>
        ) : template === "empathy" ? (
          "質問を生成する"
        ) : (
          "台本を生成する"
        )}
      </button>

      {transcript.trim() && (
        <button
          onClick={() => { setTranscript(""); setGenerated(false); setLastResultId(""); localStorage.removeItem(MEMO_KEY); }}
          className="w-full py-2 text-gray-500 hover:text-red-400 text-xs"
        >
          メモをクリア
        </button>
      )}
    </div>
  );
}

function saveToHistory(
  script: GeneratedScript,
  yaml: string,
  transcript: string,
  template: TemplateType,
  targets: TargetPlatform[]
): string {
  const key = "script-creator-history";
  const history = JSON.parse(localStorage.getItem(key) || "[]");
  const id = Date.now().toString();
  history.unshift({
    id,
    title: script.title,
    template,
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
