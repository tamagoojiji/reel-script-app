const STORAGE_KEY = "reel-script-config";

interface AppConfig {
  apiUrl: string;
  githubToken: string;
  githubRepo: string;
}

const DEFAULT_CONFIG: AppConfig = {
  apiUrl: "http://localhost:3002",
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
  return getConfig().apiUrl;
}
