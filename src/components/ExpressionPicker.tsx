import { EXPRESSIONS, EXPRESSION_LABELS, type Expression } from "../types";
import { expressionThumbnailUrl } from "../api/reelEditor";

interface Props {
  value: Expression;
  onChange: (exp: Expression) => void;
}

export default function ExpressionPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {EXPRESSIONS.map((exp) => (
        <button
          key={exp}
          onClick={() => onChange(exp)}
          className={`flex flex-col items-center p-2 rounded-lg border-2 transition-colors ${
            value === exp
              ? "border-indigo-500 bg-indigo-500/20"
              : "border-gray-700 bg-gray-800"
          }`}
        >
          <img
            src={expressionThumbnailUrl(exp)}
            alt={exp}
            className="w-10 h-10 object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-[10px] mt-1 text-gray-300">{EXPRESSION_LABELS[exp]}</span>
        </button>
      ))}
    </div>
  );
}
