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
