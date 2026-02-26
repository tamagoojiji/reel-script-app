import { getApiUrl } from "../config";
import type { GenerateStatus, PresetInfo, OverlayInfo, ExpressionInfo, ScriptScene, ScriptCta } from "../types";

function url(path: string): string {
  return `${getApiUrl()}${path}`;
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await fetch(url("/api/presets"), { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPresets(): Promise<PresetInfo[]> {
  const res = await fetch(url("/api/presets"));
  if (!res.ok) throw new Error("Failed to fetch presets");
  return res.json();
}

export async function fetchExpressions(): Promise<ExpressionInfo[]> {
  const res = await fetch(url("/api/expressions"));
  if (!res.ok) throw new Error("Failed to fetch expressions");
  return res.json();
}

export function expressionThumbnailUrl(expression: string): string {
  return url(`/api/expressions/${expression}/closed.png`);
}

export async function fetchOverlays(): Promise<OverlayInfo[]> {
  const res = await fetch(url("/api/overlays"));
  if (!res.ok) throw new Error("Failed to fetch overlays");
  return res.json();
}

export function overlayUrl(file: string): string {
  return url(`/api/overlays/${file}`);
}

export interface GenerateV2Request {
  name: string;
  preset: string;
  background?: string;
  scenes: ScriptScene[];
  cta?: ScriptCta;
}

export async function generateV2(req: GenerateV2Request): Promise<{ ok: boolean; projectId: string }> {
  const res = await fetch(url("/api/projects/generate-v2"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Generate failed");
  }
  return res.json();
}

export async function getGenerateStatus(): Promise<GenerateStatus> {
  const res = await fetch(url("/api/projects/generate/status"));
  if (!res.ok) throw new Error("Failed to get status");
  return res.json();
}

export async function uploadOverlay(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url("/api/overlays/upload"), { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  const data = await res.json();
  return data.path;
}

export async function uploadBackground(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url("/api/backgrounds/upload"), { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  const data = await res.json();
  return data.path;
}

export async function generateAiScript(theme: string): Promise<{
  script: { name: string; preset: string; scenes: ScriptScene[]; cta?: ScriptCta };
}> {
  const res = await fetch(url("/api/scripts/generate-ai"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "AI generation failed");
  }
  return res.json();
}
