import { getConfig } from "../config";
import type { ScriptScene, ScriptCta } from "../types";

const REPO = "tamagoojiji/tamago-talk-reel";
const API = "https://api.github.com";

function headers(): Record<string, string> {
  const { githubToken } = getConfig();
  return {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
  };
}

export interface CloudRenderRequest {
  name: string;
  preset: string;
  background?: string;
  scenes: ScriptScene[];
  cta?: ScriptCta;
}

export interface CloudRenderStatus {
  status: "queued" | "in_progress" | "completed" | "failure" | "cancelled" | "not_found";
  conclusion: string | null;
  runId: number | null;
  artifactUrl: string | null;
  htmlUrl: string | null;
}

/**
 * repository_dispatch でクラウドレンダリングを起動し、run_id を返す
 */
export async function triggerCloudRender(req: CloudRenderRequest): Promise<number> {
  const { githubToken } = getConfig();
  if (!githubToken) {
    throw new Error("GitHub Tokenが未設定です。Settingsで設定してください。");
  }

  const beforeTime = new Date().toISOString();

  // dispatch 送信
  const res = await fetch(`${API}/repos/${REPO}/dispatches`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: "render-reel",
      client_payload: req,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Dispatch failed: ${(err as any).message || res.statusText}`);
  }

  // dispatch は 204 を返すので、run_id を取得するために少し待つ
  await new Promise((r) => setTimeout(r, 3000));

  // 最新の workflow run を検索
  const runsRes = await fetch(
    `${API}/repos/${REPO}/actions/workflows/render-reel.yml/runs?per_page=1&created=>${beforeTime.slice(0, 19)}`,
    { headers: headers() },
  );

  if (!runsRes.ok) {
    // タイミングでまだ出てこない場合、もう一度待つ
    await new Promise((r) => setTimeout(r, 3000));
    const retry = await fetch(
      `${API}/repos/${REPO}/actions/workflows/render-reel.yml/runs?per_page=1`,
      { headers: headers() },
    );
    if (!retry.ok) throw new Error("Workflow run が見つかりません");
    const data = await retry.json();
    if (data.workflow_runs?.length > 0) return data.workflow_runs[0].id;
    throw new Error("Workflow run が見つかりません");
  }

  const data = await runsRes.json();
  if (data.workflow_runs?.length > 0) {
    return data.workflow_runs[0].id;
  }

  // フォールバック: フィルタなしで最新を取得
  const fallback = await fetch(
    `${API}/repos/${REPO}/actions/workflows/render-reel.yml/runs?per_page=1`,
    { headers: headers() },
  );
  const fbData = await fallback.json();
  if (fbData.workflow_runs?.length > 0) return fbData.workflow_runs[0].id;

  throw new Error("Workflow run が見つかりません。GitHub Actionsの設定を確認してください。");
}

/**
 * workflow run のステータスを取得
 */
export async function getCloudRenderStatus(runId: number): Promise<CloudRenderStatus> {
  const res = await fetch(`${API}/repos/${REPO}/actions/runs/${runId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    return { status: "not_found", conclusion: null, runId, artifactUrl: null, htmlUrl: null };
  }

  const run = await res.json();
  const result: CloudRenderStatus = {
    status: run.status,
    conclusion: run.conclusion,
    runId,
    artifactUrl: null,
    htmlUrl: run.html_url,
  };

  // 完了時はアーティファクトURLを取得
  if (run.status === "completed" && run.conclusion === "success") {
    const artRes = await fetch(`${API}/repos/${REPO}/actions/runs/${runId}/artifacts`, {
      headers: headers(),
    });
    if (artRes.ok) {
      const artData = await artRes.json();
      const video = artData.artifacts?.find((a: any) => a.name === "reel-video");
      if (video) {
        result.artifactUrl = `${API}/repos/${REPO}/actions/artifacts/${video.id}/zip`;
      }
    }
  }

  return result;
}

/**
 * ArrayBuffer → base64（チャンク処理でスタックオーバーフロー回避）
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * 背景ファイルを remotion リポの public/bg/ に GitHub Contents API でアップロード
 * 戻り値: "bg/{safeName}"（remotion の public/ 相対パス）
 */
const REMOTION_REPO = "tamagoojiji/remotion";

export async function uploadBackgroundToGitHub(file: File): Promise<string> {
  const { githubToken } = getConfig();
  if (!githubToken) {
    throw new Error("GitHub Tokenが未設定です。Settingsで設定してください。");
  }

  // ファイル名をASCIIセーフに変換
  const safeName = file.name
    .normalize("NFD")
    .replace(/[^\x20-\x7E.]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

  const filePath = `public/bg/${safeName}`;
  const apiUrl = `${API}/repos/${REMOTION_REPO}/contents/${filePath}`;

  // 既存ファイルの sha を取得（上書き対応）
  let sha: string | undefined;
  try {
    const check = await fetch(apiUrl, { headers: headers() });
    if (check.ok) {
      const existing = await check.json();
      sha = existing.sha;
    }
  } catch {}

  // ファイル内容を base64 に変換
  const buffer = await file.arrayBuffer();
  const content = arrayBufferToBase64(buffer);

  const body: Record<string, string> = {
    message: `add: background ${safeName}`,
    content,
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`背景アップロード失敗: ${(err as any).message || res.statusText}`);
  }

  return `bg/${safeName}`;
}

/**
 * アーティファクト（ZIP）をダウンロード
 */
export async function downloadArtifact(artifactUrl: string): Promise<void> {
  const res = await fetch(artifactUrl, {
    headers: headers(),
  });

  if (!res.ok) throw new Error("アーティファクトのダウンロードに失敗しました");

  // GitHub API は 302 リダイレクトで一時URLを返す
  // fetch は自動的にリダイレクトを追従する
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reel-video.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
