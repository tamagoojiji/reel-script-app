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
 * 動画をブラウザ内で圧縮（720p, 2Mbps）
 * Canvas + MediaRecorder で再エンコード
 */
const MAX_UPLOAD_MB = 50;

function compressVideo(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onloadedmetadata = async () => {
      const maxW = 720;
      const scale = Math.min(1, maxW / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/mp4; codecs=avc1")
        ? "video/mp4"
        : "video/webm";
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes("mp4") ? ".mp4" : ".webm";
        const newName = file.name.replace(/\.[^.]+$/, "") + ext;
        resolve(new File([blob], newName, { type: mimeType }));
        URL.revokeObjectURL(video.src);
      };

      recorder.start(100);
      const draw = () => {
        if (!video.ended && !video.paused) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(draw);
        }
      };
      video.onended = () => recorder.stop();
      video.onplay = draw;

      try {
        await video.play();
      } catch {
        reject(new Error("動画の再生に失敗しました"));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("動画の読み込みに失敗しました"));
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * 背景ファイルを remotion リポの public/bg/ に Git Data API でアップロード
 * 動画が大きい場合はブラウザ内で圧縮してからアップロード
 * 戻り値: "bg/{safeName}"（remotion の public/ 相対パス）
 */
const REMOTION_REPO = "tamagoojiji/remotion";
const BRANCH = "main";

export async function uploadBackgroundToGitHub(file: File): Promise<string> {
  const { githubToken } = getConfig();
  if (!githubToken) {
    throw new Error("GitHub Tokenが未設定です。Settingsで設定してください。");
  }

  // 動画は常に圧縮（iPhoneの4K/HEVC → 720p/2Mbps に変換）
  let uploadFile = file;
  if (file.type.startsWith("video/")) {
    uploadFile = await compressVideo(file);
  }

  // ファイル名をASCIIセーフに変換
  const safeName = uploadFile.name
    .normalize("NFD")
    .replace(/[^\x20-\x7E.]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

  const filePath = `public/bg/${safeName}`;
  const repoApi = `${API}/repos/${REMOTION_REPO}`;
  const h = { ...headers(), "Content-Type": "application/json" };

  // 1. Blob作成（base64で大容量ファイル対応）
  const buffer = await uploadFile.arrayBuffer();
  const content = arrayBufferToBase64(buffer);

  const blobRes = await fetch(`${repoApi}/git/blobs`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ content, encoding: "base64" }),
  });
  if (!blobRes.ok) {
    const err = await blobRes.json().catch(() => ({}));
    throw new Error(`Blob作成失敗: ${(err as any).message || blobRes.statusText}`);
  }
  const blobSha = (await blobRes.json()).sha;

  // 2. 現在のブランチのコミットSHA・ツリーSHAを取得
  const refRes = await fetch(`${repoApi}/git/ref/heads/${BRANCH}`, { headers: headers() });
  if (!refRes.ok) throw new Error("ブランチ情報の取得に失敗しました");
  const commitSha = (await refRes.json()).object.sha;

  const commitRes = await fetch(`${repoApi}/git/commits/${commitSha}`, { headers: headers() });
  if (!commitRes.ok) throw new Error("コミット情報の取得に失敗しました");
  const treeSha = (await commitRes.json()).tree.sha;

  // 3. 新しいツリーを作成（ファイルを追加）
  const treeRes = await fetch(`${repoApi}/git/trees`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      base_tree: treeSha,
      tree: [{ path: filePath, mode: "100644", type: "blob", sha: blobSha }],
    }),
  });
  if (!treeRes.ok) throw new Error("ツリー作成に失敗しました");
  const newTreeSha = (await treeRes.json()).sha;

  // 4. 新しいコミットを作成
  const newCommitRes = await fetch(`${repoApi}/git/commits`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      message: `add: background ${safeName}`,
      tree: newTreeSha,
      parents: [commitSha],
    }),
  });
  if (!newCommitRes.ok) throw new Error("コミット作成に失敗しました");
  const newCommitSha = (await newCommitRes.json()).sha;

  // 5. ブランチを更新
  const updateRes = await fetch(`${repoApi}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ sha: newCommitSha }),
  });
  if (!updateRes.ok) throw new Error("ブランチ更新に失敗しました");

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
