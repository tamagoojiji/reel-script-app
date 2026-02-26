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
