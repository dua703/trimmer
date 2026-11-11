"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 5 * 1024 * 1024;

export function ImageDropField({
  name,
  title,
  hint,
  disabled = false,
  scanning = false,
  onReadyChange
}: {
  name: "skin" | "hair" | "beard";
  title: string;
  hint: string;
  disabled?: boolean;
  scanning?: boolean;
  onReadyChange?: (ready: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function clearFile() {
    if (inputRef.current) inputRef.current.value = "";
    setFileName("");
    setFileSize("");
    setError(undefined);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    onReadyChange?.(false);
  }

  function acceptFile(file: File) {
    if (!allowedTypes.includes(file.type)) {
      clearFile();
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > maxBytes) {
      clearFile();
      setError("Each assessment image must be 5 MB or smaller.");
      return;
    }

    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }

    setError(undefined);
    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    onReadyChange?.(true);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      clearFile();
      return;
    }
    acceptFile(file);
  }

  return (
    <div className={`ga-drop ga-drop-${name}${dragging ? " dragging" : ""}${previewUrl ? " has-preview" : ""}${error ? " has-error" : ""}${scanning ? " scanning" : ""}`}>
      <input
        ref={inputRef}
        className="ga-file-input"
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        onChange={onFileChange}
      />
      <div
        className="ga-chamber-target"
        onClick={() => { if (!disabled) inputRef.current?.click(); }}
        onDragEnter={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          const file = event.dataTransfer.files[0];
          if (file) acceptFile(file);
        }}
      >
        {previewUrl ? (
          <img className="ga-chamber-photo" src={previewUrl} alt={`${title} preview`} />
        ) : (
          <div className="ga-drop-placeholder" aria-hidden="true">
            <UploadMark />
          </div>
        )}
        {scanning && (
          <div className="ga-chamber-live" aria-hidden="true">
            <span className="ga-scan-beam" />
            <span className="ga-scan-pulse" />
          </div>
        )}
        <div className="ga-chamber-copy">
          <strong>{title}</strong>
          <span>{hint}</span>
          <small>Drag a photo into the chamber or browse · JPEG, PNG, or WebP · max 5 MB</small>
          {fileName && <em>{fileName} · {fileSize}</em>}
        </div>
      </div>
      <div className="ga-drop-actions">
        <button className="secondary-button" type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
          {previewUrl ? "Change image" : "Browse image"}
        </button>
        {previewUrl && (
          <button className="text-button danger-button" type="button" disabled={disabled} onClick={clearFile}>
            Remove
          </button>
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}

function UploadMark() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M16 22V9" />
      <path d="M11 14l5-5 5 5" />
      <path d="M8 23v2h16v-2" />
    </svg>
  );
}
