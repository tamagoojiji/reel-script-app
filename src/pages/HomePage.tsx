import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { syncLoadScripts, syncSaveScripts, syncDeleteScript } from "../api/gasApi";
import { getGasUrl } from "../config";
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

function saveScriptsLocal(scripts: Script[]): void {
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
}

/** ローカルとクラウドのスクリプトをマージ（updatedAtが新しい方を優先） */
function mergeScripts(local: Script[], cloud: Script[]): Script[] {
  const map = new Map<string, Script>();
  for (const s of local) {
    map.set(s.id, s);
  }
  for (const s of cloud) {
    const existing = map.get(s.id);
    if (!existing || new Date(s.updatedAt) > new Date(existing.updatedAt)) {
      map.set(s.id, s);
    }
  }
  return Array.from(map.values());
}

export default function HomePage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const navigate = useNavigate();

  const hasGasUrl = !!getGasUrl();

  const syncFromCloud = useCallback(async () => {
    if (!getGasUrl()) return;

    setSyncing(true);
    setSyncMsg("");
    try {
      const { scripts: cloudScripts } = await syncLoadScripts();
      const local = loadScripts();
      const merged = mergeScripts(local, cloudScripts);
      saveScriptsLocal(merged);
      setScripts(merged);

      // マージ結果をクラウドにも反映
      if (merged.length !== cloudScripts.length || merged.some((m, i) => m.id !== cloudScripts[i]?.id)) {
        await syncSaveScripts(merged);
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
    setScripts(loadScripts());
    syncFromCloud();
  }, [syncFromCloud]);

  const deleteScript = async (id: string) => {
    const updated = scripts.filter((s) => s.id !== id);
    saveScriptsLocal(updated);
    setScripts(updated);

    // クラウドからも削除
    if (getGasUrl()) {
      try {
        await syncDeleteScript(id);
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">リール台本</h1>
        <div className="flex gap-2">
          {hasGasUrl && (
            <button
              onClick={syncFromCloud}
              disabled={syncing}
              className="text-sm px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-50"
            >
              {syncing ? "同期中..." : "☁️ 同期"}
            </button>
          )}
          <button
            onClick={() => navigate("/editor/new")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            + 新規作成
          </button>
        </div>
      </div>

      {syncMsg && (
        <p className={`text-xs text-center ${syncMsg.includes("失敗") ? "text-red-400" : "text-green-400"}`}>
          {syncMsg}
        </p>
      )}

      {scripts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">📝</p>
          <p>台本がまだありません</p>
          <p className="text-sm mt-2">「+ 新規作成」または「作成」タブで始めましょう</p>
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
