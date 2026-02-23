import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Script, ScriptScene, ScriptCta } from "../types";
import { generateAiScript } from "../api/reelEditor";

const SCRIPTS_KEY = "reel-scripts";

function loadScripts(): Script[] {
  try {
    return JSON.parse(localStorage.getItem(SCRIPTS_KEY) || "[]");
  } catch {
    return [];
  }
}

const THEME_SUGGESTIONS = [
  "USJエクスプレスパスの選び方",
  "子連れUSJ攻略テクニック",
  "USJの穴場レストラン",
  "USJ限定グッズ情報",
  "USJ開園待ちのコツ",
];

export default function AIGeneratePage() {
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!theme.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { script: aiScript } = await generateAiScript(theme);

      // Script型に変換してlocalStorageに保存
      const id = `script-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const scenes: ScriptScene[] = (aiScript.scenes || []).map((s: any) => ({
        text: s.text || "",
        expression: s.expression || "normal",
        emphasis: s.emphasis || [],
        overlay: s.overlay,
      }));
      const cta: ScriptCta | undefined = aiScript.cta
        ? { text: aiScript.cta.text, expression: aiScript.cta.expression || "bow" }
        : undefined;

      const script: Script = {
        id,
        name: aiScript.name || theme,
        preset: aiScript.preset || "coral",
        scenes,
        cta,
        createdAt: now,
        updatedAt: now,
      };

      const scripts = loadScripts();
      scripts.push(script);
      localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));

      // 編集画面へ遷移
      navigate(`/editor/${id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      <h1 className="text-xl font-bold">AI台本生成</h1>

      <div className="space-y-3">
        <label className="text-sm text-gray-400">テーマを入力</label>
        <textarea
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="例: USJエクスプレスパスの選び方"
          rows={3}
          className="w-full bg-gray-800 rounded-xl p-4 text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Suggestions */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500">テーマ候補</p>
        <div className="flex flex-wrap gap-2">
          {THEME_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setTheme(s)}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !theme.trim()}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl text-sm"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            AI生成中...
          </span>
        ) : (
          "台本を生成"
        )}
      </button>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
        <p className="text-xs text-gray-500 font-bold">使い方</p>
        <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
          <li>テーマを入力して「台本を生成」をタップ</li>
          <li>AIが10シーンの構造化台本を自動生成</li>
          <li>編集画面で表情・オーバーレイを微調整</li>
          <li>「Generate」でパイプライン実行</li>
        </ol>
      </div>
    </div>
  );
}
