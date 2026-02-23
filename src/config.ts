const STORAGE_KEY = "reel-script-config";

interface AppConfig {
  apiUrl: string;
  githubToken: string;
  githubRepo: string;
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
};

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
