import { getGasUrl } from "../config";
import type { GasResponse, QuestionsResponse, Script, TemplateType, TargetPlatform } from "../types";

async function gasPost(url: string, payload: object): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });
}

export async function generateScript(
  transcript: string,
  template: TemplateType,
  targets: TargetPlatform[]
): Promise<GasResponse> {
  const url = getGasUrl();
  if (!url) {
    throw new Error("GAS URLが設定されていません。設定画面でURLを入力してください。");
  }

  const res = await gasPost(url, {
    action: "generate",
    transcript,
    template,
    targets,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data: GasResponse = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "台本生成に失敗しました");
  }

  return data;
}

export async function generateQuestions(
  transcript: string,
  targets: TargetPlatform[]
): Promise<QuestionsResponse> {
  const url = getGasUrl();
  if (!url) {
    throw new Error("GAS URLが設定されていません。設定画面でURLを入力してください。");
  }

  const res = await gasPost(url, {
    action: "generate-questions",
    transcript,
    targets,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data: QuestionsResponse = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "質問生成に失敗しました");
  }

  return data;
}

export async function generateEmpathyScript(
  transcript: string,
  targets: TargetPlatform[],
  answers: { question: string; answer: string }[]
): Promise<GasResponse> {
  const url = getGasUrl();
  if (!url) {
    throw new Error("GAS URLが設定されていません。設定画面でURLを入力してください。");
  }

  const res = await gasPost(url, {
    action: "generate-empathy",
    transcript,
    targets,
    answers,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data: GasResponse = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "台本生成に失敗しました");
  }

  return data;
}

export async function syncSaveScripts(scripts: Script[]): Promise<{ ok: boolean; count?: number }> {
  const url = getGasUrl();
  if (!url) {
    throw new Error("GAS URLが設定されていません。設定画面でURLを入力してください。");
  }

  const res = await gasPost(url, {
    action: "sync-save",
    scripts,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "保存に失敗しました");
  }

  return data;
}

export async function syncLoadScripts(): Promise<{ ok: boolean; scripts: Script[] }> {
  const url = getGasUrl();
  if (!url) {
    throw new Error("GAS URLが設定されていません。設定画面でURLを入力してください。");
  }

  const res = await gasPost(url, {
    action: "sync-load",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "読み込みに失敗しました");
  }

  return data;
}

export async function syncDeleteScript(id: string): Promise<{ ok: boolean }> {
  const url = getGasUrl();
  if (!url) {
    throw new Error("GAS URLが設定されていません。設定画面でURLを入力してください。");
  }

  const res = await gasPost(url, {
    action: "sync-delete",
    id,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || "削除に失敗しました");
  }

  return data;
}

export async function testGasConnection(): Promise<{ ok: boolean; message: string }> {
  const url = getGasUrl();
  if (!url) {
    return { ok: false, message: "URLが空です" };
  }

  try {
    const res = await fetch(url, { redirect: "follow" });

    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { ok: data.ok, message: data.message || "接続成功" };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
