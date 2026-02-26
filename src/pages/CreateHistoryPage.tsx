import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { syncLoadHistory, syncSaveHistory } from "../api/gasApi";
import { getGasUrl } from "../config";
import type { HistoryItem } from "../types";
import { TEMPLATE_INFO } from "../types";

const HISTORY_KEY = "script-creator-history";

function loadHistoryLocal(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistoryLocal(history: HistoryItem[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function mergeHistory(local: HistoryItem[], cloud: HistoryItem[]): HistoryItem[] {
  const map = new Map<string, HistoryItem>();
  for (const h of local) {
    map.set(h.id, h);
  }
  for (const h of cloud) {
    if (!map.has(h.id)) {
      map.set(h.id, h);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function CreateHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const hasGasUrl = !!getGasUrl();

  const syncFromCloud = useCallback(async () => {
    if (!getGasUrl()) return;

    setSyncing(true);
    setSyncMsg("");
    try {
      const { history: cloudHistory } = await syncLoadHistory();
      const local = loadHistoryLocal();
      const merged = mergeHistory(local, cloudHistory);
      saveHistoryLocal(merged);
      setHistory(merged);

      if (merged.length !== cloudHistory.length) {
        await syncSaveHistory(merged);
      }

      setSyncMsg("同期完了");
    } catch (e) {
      setSyncMsg("同期失敗: " + (e as Error).message);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 3000);
    }
  }, []);

  useEffect(() => {
    setHistory(loadHistoryLocal());
    syncFromCloud();
  }, [syncFromCloud]);

  const handleOpen = (item: HistoryItem) => {
    navigate("/create/result/" + item.id);
  };

  const handleDelete = async (id: string) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    saveHistoryLocal(next);

    if (getGasUrl()) {
      try {
        await syncSaveHistory(next);
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="p-4 pb-24 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">生成履歴</h1>
        {hasGasUrl && (
          <button
            onClick={syncFromCloud}
            disabled={syncing}
            className="text-sm px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-50"
          >
            {syncing ? "同期中..." : "☁️ 同期"}
          </button>
        )}
      </div>

      {syncMsg && (
        <p className={`text-xs text-center ${syncMsg.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
          {syncMsg}
        </p>
      )}

      {history.length === 0 ? (
        <div className="text-center pt-16">
          <p className="text-gray-400">履歴がありません</p>
          <p className="text-xs text-gray-500 mt-2">台本を生成すると自動保存されます</p>
        </div>
      ) : (
        history.map((item) => (
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
        ))
      )}
    </div>
  );
}
