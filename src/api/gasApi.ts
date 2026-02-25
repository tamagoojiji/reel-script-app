import { getGasUrl } from "../config";
import type { GasResponse, TemplateType, TargetPlatform } from "../types";

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
