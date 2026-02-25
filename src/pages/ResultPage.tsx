import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ScriptPreview from "../components/ScriptPreview";
import YamlViewer from "../components/YamlViewer";
import type { HistoryItem, Script, ScriptScene } from "../types";

export default function ResultPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const data = useMemo(() => {
    if (!id) return null;

    try {
      const history: HistoryItem[] = JSON.parse(localStorage.getItem("script-creator-history") || "[]");
      const item = history.find((h) => h.id === id);
      if (item) return { script: item.script, yaml: item.yaml };
    } catch { /* localStorage破損時 */ }

    return null;
  }, [id]);

  if (!data) {
    return (
      <div className="p-4 text-center space-y-4 pt-20">
        <p className="text-gray-400">結果がありません</p>
        <button
          onClick={() => navigate("/create")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          作成画面に戻る
        </button>
      </div>
    );
  }

  const { script, yaml } = data;

  const handleOpenInEditor = () => {
    const reelScript: Script = {
      id: Date.now().toString(),
      name: script.title,
      preset: "coral",
      scenes: script.scenes.map((s): ScriptScene => ({
        text: s.text,
        expression: s.expression,
        emphasis: s.emphasis || [],
        display: s.display,
        overlay: s.overlay,
      })),
      cta: script.cta
        ? { text: script.cta.text, expression: script.cta.expression }
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const key = "reel-scripts";
    let existing: Script[] = [];
    try {
      existing = JSON.parse(localStorage.getItem(key) || "[]");
    } catch { /* ignore */ }
    existing.push(reelScript);
    localStorage.setItem(key, JSON.stringify(existing));

    navigate("/editor/" + reelScript.id);
  };

  return (
    <div className="p-4 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/create")}
          className="text-indigo-400 text-sm"
        >
          ← 戻る
        </button>
        <h1 className="text-lg font-bold">生成結果</h1>
        <div className="w-10" />
      </div>

      <ScriptPreview script={script} />
      <YamlViewer yaml={yaml} title={script.title} />

      <button
        onClick={handleOpenInEditor}
        className="w-full py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700"
      >
        編集する
      </button>

      <button
        onClick={() => navigate("/create")}
        className="w-full py-3 rounded-xl font-bold bg-gray-700 text-white hover:bg-gray-600"
      >
        新しい台本を作成
      </button>
    </div>
  );
}
