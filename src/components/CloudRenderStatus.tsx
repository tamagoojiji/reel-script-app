import type { CloudRenderStatus as Status } from "../api/cloudRender";

interface Props {
  status: Status | null;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  queued: "キューに追加済み...",
  in_progress: "レンダリング中...",
  completed: "完了!",
  failure: "エラーが発生しました",
  cancelled: "キャンセルされました",
  not_found: "ワークフローが見つかりません",
};

export default function CloudRenderStatus({ status, onClose, onDownload, downloading }: Props) {
  if (!status) return null;

  const running = status.status === "queued" || status.status === "in_progress";
  const success = status.status === "completed" && status.conclusion === "success";
  const failed = status.status === "completed" && status.conclusion !== "success";
  const label = STATUS_LABELS[status.status] || status.status;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-bold text-center">
          Cloud生成
        </h3>

        {running && (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <p className={`text-sm text-center ${failed ? "text-red-400" : success ? "text-green-400" : "text-gray-300"}`}>
          {label}
        </p>

        {success && status.artifactUrl && (
          <button
            onClick={onDownload}
            disabled={downloading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold rounded-xl text-sm"
          >
            {downloading ? "ダウンロード中..." : "動画をダウンロード"}
          </button>
        )}

        {status.htmlUrl && (
          <a
            href={status.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-indigo-400 hover:text-indigo-300"
          >
            GitHub Actionsで確認
          </a>
        )}

        {!running && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-xl text-sm"
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}
