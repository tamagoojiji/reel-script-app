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
 * 背景ファイルを reel-script-app リポに Git Data API でコミット
 * api.github.com のみ使用（CORS OK）、uploads.github.com は使わない
 * Blobs API: 最大100MB（base64込み）→ 実質約75MB
 * 戻り値: "bg/{safeName}"
 */
const BG_REPO = "tamagoojiji/reel-script-app";
const BG_BRANCH = "main";

export async function uploadBackgroundToGitHub(file: File): Promise<string> {
  const { githubToken } = getConfig();
  if (!githubToken) {
    throw new Error("GitHub Tokenが未設定です。Settingsで設定してください。");
  }

  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  if (file.size > 75 * 1024 * 1024) {
    throw new Error(`ファイルが大きすぎます(${sizeMB}MB)。75MB以下の動画を選択してください`);
  }

  const safeName = file.name
    .normalize("NFD")
    .replace(/[^\x20-\x7E.]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

  const filePath = `public/bg/${safeName}`;
  const repoApi = `${API}/repos/${BG_REPO}`;
  const h = { ...headers(), "Content-Type": "application/json" };

  // 1. Blob作成
  const buffer = await file.arrayBuffer();
  const content = arrayBufferToBase64(buffer);

  let blobRes: Response;
  try {
    blobRes = await fetch(`${repoApi}/git/blobs`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ content, encoding: "base64" }),
    });
  } catch (e: any) {
    throw new Error(`[1]Blob作成接続失敗: ${e.message}`);
  }
  if (!blobRes.ok) {
    const err = await blobRes.json().catch(() => ({}));
    throw new Error(`[1]Blob作成失敗(${blobRes.status}): ${(err as any).message || ""}`);
  }
  const blobSha = (await blobRes.json()).sha;

  // 2. 現在のブランチ情報を取得
  let commitSha: string;
  let treeSha: string;
  try {
    const refRes = await fetch(`${repoApi}/git/ref/heads/${BG_BRANCH}`, { headers: headers() });
    if (!refRes.ok) throw new Error(`ref取得失敗(${refRes.status})`);
    commitSha = (await refRes.json()).object.sha;

    const commitRes = await fetch(`${repoApi}/git/commits/${commitSha}`, { headers: headers() });
    if (!commitRes.ok) throw new Error(`commit取得失敗(${commitRes.status})`);
    treeSha = (await commitRes.json()).tree.sha;
  } catch (e: any) {
    throw new Error(`[2]ブランチ情報取得失敗: ${e.message}`);
  }

  // 3. 新しいツリーを作成
  let newTreeSha: string;
  try {
    const treeRes = await fetch(`${repoApi}/git/trees`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        base_tree: treeSha,
        tree: [{ path: filePath, mode: "100644", type: "blob", sha: blobSha }],
      }),
    });
    if (!treeRes.ok) throw new Error(`tree作成失敗(${treeRes.status})`);
    newTreeSha = (await treeRes.json()).sha;
  } catch (e: any) {
    throw new Error(`[3]ツリー作成失敗: ${e.message}`);
  }

  // 4. コミット作成 + ブランチ更新
  try {
    const newCommitRes = await fetch(`${repoApi}/git/commits`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        message: `add: background ${safeName}`,
        tree: newTreeSha,
        parents: [commitSha],
      }),
    });
    if (!newCommitRes.ok) throw new Error(`commit作成失敗(${newCommitRes.status})`);
    const newCommitSha = (await newCommitRes.json()).sha;

    const updateRes = await fetch(`${repoApi}/git/refs/heads/${BG_BRANCH}`, {
      method: "PATCH",
      headers: h,
      body: JSON.stringify({ sha: newCommitSha }),
    });
    if (!updateRes.ok) throw new Error(`ref更新失敗(${updateRes.status})`);
  } catch (e: any) {
    throw new Error(`[4]コミット失敗: ${e.message}`);
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
