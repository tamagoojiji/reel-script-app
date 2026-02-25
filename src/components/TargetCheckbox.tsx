import type { TargetPlatform } from "../types";
import { TARGET_PLATFORMS } from "../types";

interface Props {
  value: TargetPlatform[];
  onChange: (targets: TargetPlatform[]) => void;
}

export default function TargetCheckbox({ value, onChange }: Props) {
  const toggle = (platform: TargetPlatform) => {
    if (value.includes(platform)) {
      const next = value.filter((v) => v !== platform);
      if (next.length > 0) onChange(next);
    } else {
      onChange([...value, platform]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-300">投稿対象</label>
      <div className="flex flex-wrap gap-2">
        {TARGET_PLATFORMS.map((platform) => {
          const active = value.includes(platform);
          return (
            <button
              key={platform}
              onClick={() => toggle(platform)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                  : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500"
              }`}
            >
              {active ? "✓ " : ""}{platform}
            </button>
          );
        })}
      </div>
    </div>
  );
}
