import { useState } from "react";
import type { ScriptScene, Expression } from "../types";
import { EXPRESSION_LABELS } from "../types";
import ExpressionPicker from "./ExpressionPicker";

interface Props {
  index: number;
  scene: ScriptScene;
  onChange: (scene: ScriptScene) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function SceneCard({ index, scene, onChange, onDelete, onMoveUp, onMoveDown }: Props) {
  const [showExpPicker, setShowExpPicker] = useState(false);

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
          <button
            onClick={() => setShowExpPicker(!showExpPicker)}
            className="text-sm px-2 py-1 rounded bg-gray-700 text-gray-300"
          >
            {EXPRESSION_LABELS[scene.expression]}
          </button>
        </div>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <button onClick={onMoveUp} className="p-1.5 text-gray-500 hover:text-white text-sm">
              ▲
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="p-1.5 text-gray-500 hover:text-white text-sm">
              ▼
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 text-red-500 hover:text-red-400 text-sm">
            ✕
          </button>
        </div>
      </div>

      {/* Expression Picker */}
      {showExpPicker && (
        <div className="pb-2">
          <ExpressionPicker
            value={scene.expression}
            onChange={(exp: Expression) => {
              onChange({ ...scene, expression: exp });
              setShowExpPicker(false);
            }}
          />
        </div>
      )}

      {/* Text */}
      <textarea
        value={scene.text}
        onChange={(e) => onChange({ ...scene, text: e.target.value })}
        placeholder="セリフを入力..."
        rows={2}
        className="w-full bg-gray-900 rounded-lg p-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {/* Emphasis */}
      <input
        type="text"
        value={scene.emphasis.join(", ")}
        onChange={(e) =>
          onChange({
            ...scene,
            emphasis: e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder="強調ワード（カンマ区切り）"
        className="w-full bg-gray-900 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {/* Overlay */}
      <input
        type="text"
        value={scene.overlay || ""}
        onChange={(e) => onChange({ ...scene, overlay: e.target.value || undefined })}
        placeholder="overlays/ファイル名.png（任意）"
        className="w-full bg-gray-900 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}
