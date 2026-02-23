import { getConfig } from "../config";
import type { Script } from "../types";

function formatDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMarkdown(script: Script): string {
  const lines: string[] = [];
  lines.push(`# ${script.name}`);
  lines.push("");
  lines.push("> [!info] 基本情報");
  lines.push(`> - **作成日**: ${formatDate()}`);
  lines.push(`> - **プリセット**: ${script.preset}`);
  lines.push(`> - **シーン数**: ${script.scenes.length}`);
  lines.push("");
  lines.push("> [!script]- 台本（タップで展開）");
  script.scenes.forEach((scene, i) => {
    const parts = [`**Scene ${i + 1}** — ${scene.expression}`];
    if (scene.overlay) parts[0] += ` / overlay: ${scene.overlay.replace("overlays/", "")}`;
    lines.push(`> ${parts[0]}`);
    lines.push(`> ${scene.text}`);
    if (scene.emphasis.length > 0) {
      lines.push(`> 強調: ${scene.emphasis.map((e) => `==${e}==`).join(" ")}`);
    }
    lines.push(">");
  });
  if (script.cta) {
    lines.push(`> **CTA** — ${script.cta.expression}`);
    lines.push(`> ${script.cta.text}`);
    lines.push(">");
  }
  lines.push("");

  // YAML block
  const yamlLines = [
    "style: natural",
    `preset: ${script.preset}`,
    "scenes:",
  ];
  for (const scene of script.scenes) {
    yamlLines.push(`  - text: "${scene.text}"`);
    yamlLines.push(`    expression: ${scene.expression}`);
    if (scene.emphasis.length > 0) {
      yamlLines.push(`    emphasis: [${scene.emphasis.map((e) => `"${e}"`).join(", ")}]`);
    }
    if (scene.overlay) {
      yamlLines.push(`    overlay: ${scene.overlay}`);
    }
  }
  if (script.cta) {
    yamlLines.push("cta:");
    yamlLines.push(`  text: "${script.cta.text}"`);
    yamlLines.push(`  expression: ${script.cta.expression}`);
  }

  lines.push("> [!tip]- YAML（タップで展開）");
  lines.push("> ```yaml");
  yamlLines.forEach((l) => lines.push(`> ${l}`));
  lines.push("> ```");
  lines.push("");
  lines.push("## 関連リンク");
  lines.push("- [[投稿ネタ・企画]]");

  return lines.join("\n");
}

export async function saveToObsidian(script: Script): Promise<string> {
  const { githubToken, githubRepo } = getConfig();
  if (!githubToken || !githubRepo) {
    throw new Error("GitHub Token/Repoが未設定です。Settingsで設定してください。");
  }

  const fileName = `${formatDate()}-${script.name}.md`;
  const filePath = `リール台本/${fileName}`;
  const content = buildMarkdown(script);
  const encoded = btoa(unescape(encodeURIComponent(content)));

  const apiUrl = `https://api.github.com/repos/${githubRepo}/contents/${encodeURIComponent(filePath)}`;

  // Check if file exists (to get sha for update)
  let sha: string | undefined;
  try {
    const check = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${githubToken}` },
    });
    if (check.ok) {
      const existing = await check.json();
      sha = existing.sha;
    }
  } catch {}

  const body: Record<string, string> = {
    message: `add: リール台本 - ${script.name}`,
    content: encoded,
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub API error: ${(err as any).message || res.statusText}`);
  }

  return filePath;
}
