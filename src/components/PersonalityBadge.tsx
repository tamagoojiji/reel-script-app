import type { PersonalityType } from "../types";
import { PERSONALITY_EMOJI, PERSONALITY_COLORS } from "../types";

interface Props {
  type: PersonalityType;
}

export default function PersonalityBadge({ type }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${PERSONALITY_COLORS[type]}`}
    >
      {PERSONALITY_EMOJI[type]} {type}
    </span>
  );
}
