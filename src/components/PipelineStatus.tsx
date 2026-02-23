import type { GenerateStatus } from "../types";

interface Props {
  status: GenerateStatus | null;
  onClose: () => void;
}

export default function PipelineStatus({ status, onClose }: Props) {
  if (!status) return null;

  const done = !status.running && !status.error && status.projectId;
  const failed = !status.running && !!status.error;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-bold text-center">
          {status.running ? "パイプライン実行中..." : done ? "完了!" : "エラー"}
        </h3>

        {status.running && (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <p className={`text-sm text-center ${failed ? "text-red-400" : "text-gray-300"}`}>
          {status.progress || status.error}
        </p>

        {!status.running && (
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-xl text-sm font-bold ${
              done
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-200"
            }`}
          >
            {done ? "OK" : "閉じる"}
          </button>
        )}
      </div>
    </div>
  );
}
