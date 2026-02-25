import type { GeneratedScript } from "../types";
import { EXPRESSION_EMOJI, EXPRESSION_LABELS } from "../types";
import PersonalityBadge from "./PersonalityBadge";

interface Props {
  script: GeneratedScript;
}

export default function ScriptPreview({ script }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">{script.title}</h2>

      {script.scenes.map((scene, i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">#{i + 1}</span>
              <span className="text-sm text-gray-400">{scene.role}</span>
            </div>
            <PersonalityBadge type={scene.personality} />
          </div>

          <p className="text-white text-sm leading-relaxed">{scene.text}</p>

          {scene.display && scene.display !== scene.text && (
            <p className="text-xs text-gray-400 border-l-2 border-gray-600 pl-2">
              字幕: {scene.display}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              {EXPRESSION_EMOJI[scene.expression]} {EXPRESSION_LABELS[scene.expression]}
            </span>
            {scene.emphasis.length > 0 && (
              <span>
                強調: {scene.emphasis.map((e) => `「${e}」`).join(" ")}
              </span>
            )}
          </div>
        </div>
      ))}

      {script.cta && (
        <div className="bg-amber-900/30 border border-amber-700/40 rounded-lg p-3 space-y-1">
          <div className="text-xs text-amber-400 font-bold">CTA</div>
          <p className="text-white text-sm">{script.cta.text}</p>
          <div className="text-xs text-gray-500">
            {EXPRESSION_EMOJI[script.cta.expression]} {EXPRESSION_LABELS[script.cta.expression]}
          </div>
        </div>
      )}

      {script.caption && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-1">
          <div className="text-xs text-gray-400 font-bold">キャプション</div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{script.caption}</p>
        </div>
      )}

      {script.hashtags && script.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {script.hashtags.map((tag, i) => (
            <span key={i} className="text-xs text-indigo-400">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
