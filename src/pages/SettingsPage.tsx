import { useState, useEffect } from "react";
import { getConfig, saveConfig } from "../config";
import { testConnection } from "../api/reelEditor";

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [connStatus, setConnStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = getConfig();
    setApiUrl(config.apiUrl);
    setGithubToken(config.githubToken);
    setGithubRepo(config.githubRepo);
  }, []);

  const handleSave = () => {
    saveConfig({ apiUrl, githubToken, githubRepo });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setConnStatus("testing");
    const ok = await testConnection();
    setConnStatus(ok ? "ok" : "fail");
    setTimeout(() => setConnStatus("idle"), 3000);
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      <h1 className="text-xl font-bold">設定</h1>

      {/* Reel Editor API */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-400">Reel Editor API</h2>
        <div className="space-y-2">
          <label className="text-xs text-gray-500">API URL</label>
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:3002"
            className="w-full bg-gray-800 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            {["http://localhost:3002", "http://192.168.1.2:3002"].map((u) => (
              <button
                key={u}
                onClick={() => setApiUrl(u)}
                className="text-[10px] bg-gray-800 text-gray-500 px-2 py-1 rounded"
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleTest}
          disabled={connStatus === "testing"}
          className={`w-full py-2 rounded-lg text-sm font-bold ${
            connStatus === "ok"
              ? "bg-green-700 text-white"
              : connStatus === "fail"
              ? "bg-red-700 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-300"
          }`}
        >
          {connStatus === "testing"
            ? "接続テスト中..."
            : connStatus === "ok"
            ? "接続OK"
            : connStatus === "fail"
            ? "接続失敗"
            : "接続テスト"}
        </button>
      </section>

      {/* GitHub / Obsidian */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-400">GitHub（Obsidian保存）</h2>
        <div className="space-y-2">
          <label className="text-xs text-gray-500">Personal Access Token</label>
          <input
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            type="password"
            placeholder="ghp_..."
            className="w-full bg-gray-800 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-gray-500">リポジトリ</label>
          <input
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            placeholder="tamagoojiji/USJ-Knowledge"
            className="w-full bg-gray-800 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl text-sm font-bold ${
          saved ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
        }`}
      >
        {saved ? "保存しました!" : "設定を保存"}
      </button>
    </div>
  );
}
