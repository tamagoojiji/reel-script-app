export type Expression =
  | "normal"
  | "cry"
  | "dizzy"
  | "idea"
  | "tired"
  | "frustrated"
  | "surprised"
  | "bow";

export const EXPRESSIONS: Expression[] = [
  "normal",
  "surprised",
  "idea",
  "frustrated",
  "dizzy",
  "tired",
  "cry",
  "bow",
];

export const EXPRESSION_LABELS: Record<Expression, string> = {
  normal: "通常",
  surprised: "驚き",
  idea: "ひらめき",
  frustrated: "落胆",
  dizzy: "困惑",
  tired: "疲れ",
  cry: "泣き",
  bow: "お辞儀",
};

export type VoicePreset = "shimmer" | "nova" | "coral";

export const VOICE_PRESETS: VoicePreset[] = ["coral", "shimmer", "nova"];

export const VOICE_PRESET_LABELS: Record<VoicePreset, string> = {
  shimmer: "🎀 かわいい女の子",
  nova: "✨ キラキラ元気ガール",
  coral: "🎤 ノリツッコミお姉さん",
};

export interface ScriptScene {
  text: string;
  expression: Expression;
  emphasis: string[];
  overlay?: string;
  display?: string;
}

export interface ScriptCta {
  text: string;
  expression: Expression;
}

export interface Script {
  id: string;
  name: string;
  preset: string;
  background?: string;
  scenes: ScriptScene[];
  cta?: ScriptCta;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateStatus {
  running: boolean;
  progress: string;
  error: string;
  projectId: string;
}

export interface PresetInfo {
  name: string;
  voice: string;
  speed: number;
  description: string;
}

export interface OverlayInfo {
  name: string;
  path: string;
  url: string;
}

export interface ExpressionInfo {
  name: string;
  thumbnail: string;
}

// --- script-creator-app 統合 ---

export const EXPRESSION_EMOJI: Record<Expression, string> = {
  normal: "😐",
  surprised: "😲",
  idea: "💡",
  frustrated: "😞",
  dizzy: "😵",
  tired: "😮‍💨",
  cry: "😢",
  bow: "🙇",
};

export type PersonalityType = "Moon" | "Earth" | "Sun";

export const PERSONALITY_EMOJI: Record<PersonalityType, string> = {
  Moon: "🌙",
  Earth: "🌍",
  Sun: "☀️",
};

export const PERSONALITY_COLORS: Record<PersonalityType, string> = {
  Moon: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  Earth: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Sun: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export type TemplateType = "prep" | "aida" | "empathy" | "engagement";

export const TEMPLATE_INFO: Record<TemplateType, { name: string; description: string }> = {
  prep: { name: "PREP型", description: "結論先出し（20-30秒・攻略系）" },
  aida: { name: "AIDA型", description: "感情訴求（30-60秒・体験レポート）" },
  empathy: { name: "EMPATHY型", description: "失敗共感→情報→感情（50-60秒）" },
  engagement: { name: "ENGAGEMENT型", description: "否定・ツッコミ・共感→商品（30秒）" },
};

export interface GasQuestion {
  id: number;
  question: string;
  purpose: string;
}

export interface QuestionsResponse {
  ok: boolean;
  questions?: GasQuestion[];
  error?: string;
}

export type TargetPlatform = "リール" | "ストーリーズ" | "Threads" | "X";

export const TARGET_PLATFORMS: TargetPlatform[] = ["リール", "ストーリーズ", "Threads", "X"];

export interface GeneratedScene {
  text: string;
  display?: string;
  expression: Expression;
  emphasis: string[];
  personality: PersonalityType;
  role: string;
  overlay?: string;
}

export interface GeneratedScript {
  title: string;
  template: TemplateType;
  scenes: GeneratedScene[];
  cta: {
    text: string;
    expression: Expression;
  };
  hashtags?: string[];
  caption?: string;
}

export interface GasResponse {
  ok: boolean;
  script?: GeneratedScript;
  yaml?: string;
  error?: string;
  message?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  template: TemplateType;
  transcript: string;
  targets: TargetPlatform[];
  script: GeneratedScript;
  yaml: string;
  createdAt: string;
}
