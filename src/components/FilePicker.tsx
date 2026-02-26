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

  const displayName = value ? value.split("/").pop() || value : "";

  const handleClick = () => {
    if (!uploading) inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset so same file can be re-selected
    e.target.value = "";

    setUploading(true);
    setError("");
    try {
      const path = await onUpload(file);
      onChange(path);
    } catch (err: any) {
      setError(err.message || "アップロード失敗");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setError("");
  };

  return (
    <div className="space-y-1">
      <span className="text-xs text-gray-500 font-mono">{label}</span>
      <div
        onClick={handleClick}
        className="flex items-center gap-2 w-full bg-gray-900 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-850 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
      {error && <p className="text-xs text-red-400">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
    </div>
  );
}
