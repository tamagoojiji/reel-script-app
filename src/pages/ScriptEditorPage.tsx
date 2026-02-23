import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Script, ScriptScene, GenerateStatus } from "../types";
import SceneCard from "../components/SceneCard";
import PipelineStatus from "../components/PipelineStatus";
import { generateV2, getGenerateStatus } from "../api/reelEditor";
import { saveToObsidian } from "../api/github";

const SCRIPTS_KEY = "reel-scripts";

function loadScripts(): Script[] {
  try {
    return JSON.parse(localStorage.getItem(SCRIPTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveScripts(scripts: Script[]): void {
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
}

function newScene(): ScriptScene {
  return { text: "", expression: "normal", emphasis: [] };
}

function generateId(): string {
  return `script-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function ScriptEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [name, setName] = useState("");
  const [preset, setPreset] = useState("coral");
  const [scenes, setScenes] = useState<ScriptScene[]>([newScene()]);
  const [ctaText, setCtaText] = useState("");
  const [ctaExpression, setCtaExpression] = useState<"bow" | "normal">("bow");
  const [scriptId, setScriptId] = useState(generateId());
  const [pipelineStatus, setPipelineStatus] = useState<GenerateStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [obsidianMsg, setObsidianMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!isNew && id) {
      const scripts = loadScripts();
      const found = scripts.find((s) => s.id === id);
      if (found) {
        setScriptId(found.id);
        setName(found.name);
        setPreset(found.preset);
        setScenes(found.scenes);
        setCtaText(found.cta?.text || "");
        setCtaExpression((found.cta?.expression as "bow" | "normal") || "bow");
      }
    }
  }, [id, isNew]);

  const save = useCallback(() => {
    const scripts = loadScripts();
    const now = new Date().toISOString();
    const script: Script = {
      id: scriptId,
      name: name || "無題の台本",
      preset,
      scenes,
      cta: ctaText ? { text: ctaText, expression: ctaExpression } : undefined,
      createdAt: scripts.find((s) => s.id === scriptId)?.createdAt || now,
      updatedAt: now,
    };
    const idx = scripts.findIndex((s) => s.id === scriptId);
    if (idx >= 0) {
      scripts[idx] = script;
    } else {
      scripts.push(script);
    }
    saveScripts(scripts);
    return script;
  }, [scriptId, name, preset, scenes, ctaText, ctaExpression]);

  const handleGenerate = async () => {
    const script = save();
    try {
      const result = await generateV2({
        name: script.name,
        preset: script.preset,
        scenes: script.scenes,
        cta: script.cta,
      });
      setPipelineStatus({
        running: true,
        progress: "パイプライン開始...",
        error: "",
        projectId: result.projectId,
      });

      pollRef.current = setInterval(async () => {
        try {
          const status = await getGenerateStatus();
          setPipelineStatus(status);
          if (!status.running) {
            clearInterval(pollRef.current);
          }
        } catch {
          clearInterval(pollRef.current);
          setPipelineStatus((prev) =>
            prev ? { ...prev, running: false, error: "ポーリング失敗" } : null
          );
        }
      }, 1500);
    } catch (e: any) {
      setPipelineStatus({
        running: false,
        progress: "",
        error: e.message,
        projectId: "",
      });
    }
  };

  const handleSaveObsidian = async () => {
    const script = save();
    setSaving(true);
    setObsidianMsg("");
    try {
      const filePath = await saveToObsidian(script);
      setObsidianMsg(`保存完了: ${filePath}`);
    } catch (e: any) {
      setObsidianMsg(`エラー: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateScene = (index: number, scene: ScriptScene) => {
    setScenes((prev) => prev.map((s, i) => (i === index ? scene : s)));
  };

  const deleteScene = (index: number) => {
    setScenes((prev) => prev.filter((_, i) => i !== index));
  };

  const moveScene = (from: number, to: number) => {
    setScenes((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const addScene = () => {
    setScenes((prev) => [...prev, newScene()]);
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => { save(); navigate("/"); }} className="text-gray-400 text-lg">
          ←
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="台本タイトル"
          className="flex-1 bg-transparent text-lg font-bold placeholder-gray-600 focus:outline-none"
        />
      </div>

      {/* Preset */}
      <div className="flex gap-2">
        {["coral", "nova"].map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${
              preset === p ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Scenes */}
      <div className="space-y-3">
        {scenes.map((scene, i) => (
          <SceneCard
            key={i}
            index={i}
            scene={scene}
            onChange={(s) => updateScene(i, s)}
            onDelete={() => deleteScene(i)}
            onMoveUp={i > 0 ? () => moveScene(i, i - 1) : undefined}
            onMoveDown={i < scenes.length - 1 ? () => moveScene(i, i + 1) : undefined}
          />
        ))}
      </div>

      <button
        onClick={addScene}
        className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 text-sm hover:border-gray-500 hover:text-gray-400"
      >
        + シーン追加
      </button>

      {/* CTA */}
      <div className="bg-gray-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">CTA</span>
          <select
            value={ctaExpression}
            onChange={(e) => setCtaExpression(e.target.value as "bow" | "normal")}
            className="bg-gray-700 text-xs text-gray-300 rounded px-2 py-1"
          >
            <option value="bow">お辞儀</option>
            <option value="normal">通常</option>
          </select>
        </div>
        <input
          value={ctaText}
          onChange={(e) => setCtaText(e.target.value)}
          placeholder="CTAメッセージ（例: ハイライトをみてね！）"
          className="w-full bg-gray-900 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleGenerate}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm"
        >
          Generate（パイプライン実行）
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => { save(); navigate("/"); }}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-xl text-sm"
          >
            保存
          </button>
          <button
            onClick={handleSaveObsidian}
            disabled={saving}
            className="flex-1 py-3 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 text-white font-bold rounded-xl text-sm"
          >
            {saving ? "保存中..." : "Obsidian保存"}
          </button>
        </div>
        {obsidianMsg && (
          <p className={`text-xs text-center ${obsidianMsg.startsWith("エラー") ? "text-red-400" : "text-green-400"}`}>
            {obsidianMsg}
          </p>
        )}
      </div>

      {/* Pipeline Status Modal */}
      <PipelineStatus status={pipelineStatus} onClose={() => setPipelineStatus(null)} />
    </div>
  );
}
