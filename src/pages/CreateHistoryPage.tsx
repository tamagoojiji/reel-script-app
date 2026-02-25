import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { HistoryItem } from "../types";
import { TEMPLATE_INFO } from "../types";

export default function CreateHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("script-creator-history") || "[]");
      setHistory(data);
    } catch { /* localStorage破損時は空履歴 */ }
  }, []);

  const handleOpen = (item: HistoryItem) => {
    navigate("/create/result/" + item.id);
  };

  const handleDelete = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    localStorage.setItem("script-creator-history", JSON.stringify(next));
  };

  if (history.length === 0) {
    return (
      <div className="p-4 pb-24 text-center pt-20">
        <p className="text-gray-400">履歴がありません</p>
        <p className="text-xs text-gray-500 mt-2">台本を生成すると自動保存されます</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-3">
      <h1 className="text-xl font-bold">生成履歴</h1>

      {history.map((item) => (
        <div key={item.id} className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpen(item)}>
              <div className="font-bold text-sm truncate">{item.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                  {TEMPLATE_INFO[item.template].name}
                </span>
                <span className="text-xs text-gray-500">
                  {item.script.scenes.length} シーン
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(item.createdAt).toLocaleString("ja-JP")}
              </div>
            </div>
            <button
              onClick={() => handleDelete(item.id)}
              className="text-gray-500 hover:text-red-400 text-sm ml-2 p-1"
            >
              ✕
            </button>
          </div>
          <div className="text-xs text-gray-500 truncate">
            {item.transcript.substring(0, 80)}{item.transcript.length > 80 ? "..." : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
