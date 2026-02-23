import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Script } from "../types";

const SCRIPTS_KEY = "reel-scripts";

function loadScripts(): Script[] {
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setScripts(loadScripts());
  }, []);

  const deleteScript = (id: string) => {
    const updated = scripts.filter((s) => s.id !== id);
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(updated));
    setScripts(updated);
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">リール台本</h1>
        <button
          onClick={() => navigate("/editor/new")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          + 新規作成
        </button>
      </div>

      {scripts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">📝</p>
          <p>台本がまだありません</p>
          <p className="text-sm mt-2">「+ 新規作成」または「AI生成」で始めましょう</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((script) => (
              <div
                key={script.id}
                className="bg-gray-800 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">{script.name}</h3>
                  <span className="text-xs text-gray-500">
                    {new Date(script.updatedAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">
                  {script.scenes.map((s) => s.text).join(" / ")}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {script.scenes.length}シーン / {script.preset}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/editor/${script.id}`)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-gray-300"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => deleteScript(script.id)}
                      className="text-xs bg-red-900/50 hover:bg-red-900 px-3 py-1.5 rounded-lg text-red-400"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
