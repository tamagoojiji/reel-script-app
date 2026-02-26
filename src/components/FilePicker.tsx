import { useRef, useState } from "react";

interface FilePickerProps {
  value: string;
  onChange: (path: string) => void;
  onUpload: (file: File) => Promise<string>;
  accept: string;
  placeholder: string;
  label: string;
}

export default function FilePicker({ value, onChange, onUpload, accept, placeholder, label }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [manualMode, setManualMode] = useState(false);

  const displayName = value ? value.split("/").pop() || value : "";

  const handlePickerClick = () => {
    if (!uploading) inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    setError("");
    try {
      const path = await onUpload(file);
      onChange(path);
    } catch (err: any) {
      const msg = err.message || "アップロード失敗";
      if (msg === "Failed to fetch") {
        setError("サーバー未接続。✏️で手入力してください");
      } else {
        setError(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setError("");
  };

  const toggleManual = (e: React.MouseEvent) => {
    e.stopPropagation();
    setManualMode(!manualMode);
    setError("");
  };

  // 手入力モード
  if (manualMode) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">{label}</span>
          <button onClick={toggleManual} className="text-xs text-indigo-400 hover:text-indigo-300">
            ファイル選択に戻す
          </button>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-900 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    );
  }

  // ファイル選択モード
  return (
    <div className="space-y-1">
      <span className="text-xs text-gray-500 font-mono">{label}</span>
      <div className="flex items-center gap-1">
        <div
          onClick={handlePickerClick}
          className="flex items-center gap-2 flex-1 bg-gray-900 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-850"
        >
          {uploading ? (
            <span className="text-xs text-indigo-400 animate-pulse flex-1">アップロード中...</span>
          ) : displayName ? (
            <span className="text-xs text-gray-300 flex-1 truncate">{displayName}</span>
          ) : (
            <span className="text-xs text-gray-600 flex-1">{placeholder}</span>
          )}
          {value && !uploading && (
            <button onClick={handleClear} className="text-gray-500 hover:text-red-400 text-xs shrink-0">
              ✕
            </button>
          )}
        </div>
        <button
          onClick={toggleManual}
          className="p-2 text-gray-500 hover:text-gray-300 text-xs shrink-0"
          title="手入力"
        >
          ✏️
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
    </div>
  );
}
