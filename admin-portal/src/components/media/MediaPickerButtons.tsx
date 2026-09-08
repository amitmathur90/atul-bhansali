import { ImagePlus, Library } from "lucide-react";
import { useRef, useState } from "react";
import { MediaLibraryModal, type MediaAsset } from "./MediaLibraryModal";

export function MediaPickerButtons({
  onFile,
  onLibrarySelect,
  accept = "image/png,image/jpeg,image/webp,image/heic",
}: {
  onFile: (file: File) => void;
  onLibrarySelect: (asset: MediaAsset) => void;
  accept?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ImagePlus size={14} /> अपलोड करें
      </button>
      <button
        type="button"
        onClick={() => setLibraryOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Library size={14} /> मीडिया लाइब्रेरी
      </button>
      {libraryOpen && (
        <MediaLibraryModal
          onClose={() => setLibraryOpen(false)}
          onInsert={(assets) => {
            if (assets[0]) onLibrarySelect(assets[0]);
            setLibraryOpen(false);
          }}
        />
      )}
    </div>
  );
}
