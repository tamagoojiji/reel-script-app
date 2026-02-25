const STORAGE_KEY = "reel-script-config";

interface AppConfig {
  apiUrl: string;
  githubToken: string;
  githubRepo: string;
  gasUrl: string;
}

function detectDefaultApiUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3002";
  // /app/ パスから配信されている場合は同一オリジン
  if (window.location.pathname.startsWith("/app")) {
    return window.location.origin;
  }
  return "http://localhost:3002";
}

const DEFAULT_CONFIG: AppConfig = {
  apiUrl: "",
  githubToken: "",
  githubRepo: "tamagoojiji/USJ-Knowledge",
  gasUrl: "",
};

// 旧 script-creator-app のキーからマイグレーション
function migrateGasUrl(): void {
  const OLD_KEY = "script-creator-gas-url";
  const oldUrl = localStorage.getItem(OLD_KEY);
  if (oldUrl) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : {};
      if (!current.gasUrl) {
        current.gasUrl = oldUrl;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      }
    } catch { /* ignore */ }
    localStorage.removeItem(OLD_KEY);
  }
}
migrateGasUrl();

export function getConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Partial<AppConfig>): void {
  const current = getConfig();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...config }));
}

export function getApiUrl(): string {
  const config = getConfig();
  if (!config.apiUrl) return detectDefaultApiUrl();
  return config.apiUrl;
}

export function getGasUrl(): string {
  return getConfig().gasUrl;
}
