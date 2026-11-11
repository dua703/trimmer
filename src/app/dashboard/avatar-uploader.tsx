"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { removeProfilePicture, uploadProfilePicture } from "@/app/actions/profile";

const cropSize = 320;

export function AvatarUploader({
  firstName,
  profilePicture,
  preview = false
}: {
  firstName: string;
  profilePicture: string | null;
  preview?: boolean;
}) {
  const [avatarUrl, setAvatarUrl] = useState(profilePicture ? "/api/profile/picture" : null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceDimensions, setSourceDimensions] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>();
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!sourceImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image cropping is not supported by this browser.");

    const scale = Math.max(cropSize / sourceImage.naturalWidth, cropSize / sourceImage.naturalHeight) * zoom;
    const width = sourceImage.naturalWidth * scale;
    const height = sourceImage.naturalHeight * scale;
    context.clearRect(0, 0, cropSize, cropSize);
    context.fillStyle = "#f4e9e3";
    context.fillRect(0, 0, cropSize, cropSize);
    context.drawImage(
      sourceImage,
      (cropSize - width) / 2 + offset.x,
      (cropSize - height) / 2 + offset.y,
      width,
      height
    );
  }, [sourceImage, zoom, offset]);

  function choosePicture(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({ error: "Choose a JPEG, PNG, or WebP image." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ error: "Profile picture must be 5 MB or smaller." });
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    const image = new Image();
    image.onload = () => {
      setSourceUrl(url);
      setSourceImage(image);
      setSourceDimensions(`${image.naturalWidth} × ${image.naturalHeight} px`);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setFeedback(undefined);
    };
    image.onerror = () => setFeedback({ error: "This image could not be opened. Choose another file." });
    image.src = url;
  }

  function updateOffset(x: number, y: number, nextZoom = zoom) {
    if (!sourceImage) return;
    const scale = Math.max(cropSize / sourceImage.naturalWidth, cropSize / sourceImage.naturalHeight) * nextZoom;
    const maxX = Math.max(0, (sourceImage.naturalWidth * scale - cropSize) / 2);
    const maxY = Math.max(0, (sourceImage.naturalHeight * scale - cropSize) / 2);
    setOffset({
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    });
  }

  function saveCrop() {
    const previewCanvas = canvasRef.current;
    if (!previewCanvas || isPending) return;
    const output = document.createElement("canvas");
    output.width = 512;
    output.height = 512;
    const context = output.getContext("2d");
    if (!context) {
      setFeedback({ error: "Image cropping is not supported by this browser." });
      return;
    }
    context.drawImage(previewCanvas, 0, 0, output.width, output.height);
    output.toBlob((blob) => {
      if (!blob) {
        setFeedback({ error: "Could not prepare the cropped image. Please try again." });
        return;
      }

      const file = new File([blob], "profile-picture.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.set("picture", file);
      const nextUrl = URL.createObjectURL(file);
      objectUrls.current.push(nextUrl);
      if (preview) {
        setAvatarUrl(nextUrl);
        setFeedback({ message: "Preview only — nothing was saved." });
        setSourceUrl(null);
        setSourceImage(null);
        return;
      }
      startTransition(async () => {
        const result = await uploadProfilePicture(undefined, formData);
        if (result?.error) {
          setFeedback({ error: result.error });
          return;
        }
        setAvatarUrl(nextUrl);
        setFeedback({ message: result?.message || "Profile picture updated." });
        setSourceUrl(null);
        setSourceImage(null);
      });
    }, "image/jpeg", 0.92);
  }

  function deletePicture() {
    if (isPending) return;
    if (preview) {
      setAvatarUrl(null);
      setFeedback({ message: "Preview only — nothing was saved." });
      return;
    }
    startTransition(async () => {
      const result = await removeProfilePicture(undefined, new FormData());
      if (result?.error) {
        setFeedback({ error: result.error });
        return;
      }
      setAvatarUrl(null);
      setFeedback({ message: result?.message || "Profile picture removed." });
    });
  }

  return (
    <>
      <div className="avatar-row profile-avatar-row">
        <div className="profile-avatar-stage">
          {avatarUrl
            ? <img className="profile-avatar" src={avatarUrl} alt="Your profile picture" />
            : <div className="profile-avatar avatar-placeholder" aria-label="No profile picture">{firstName.slice(0, 1)}</div>}
        </div>
        <div className="avatar-upload profile-avatar-actions">
          <label className="profile-photo-action">
            <span className="profile-photo-hint">Profile picture (JPEG, PNG, or WebP; up to 5 MB)</span>
            <input
              className="profile-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isPending}
              onChange={(event) => {
                choosePicture(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <span className="secondary-button profile-photo-button">{isPending ? "Please wait…" : "Change photo"}</span>
          </label>
          {avatarUrl && <button className="secondary-button" type="button" onClick={deletePicture} disabled={isPending}>{isPending ? "Please wait…" : "Remove picture"}</button>}
        </div>
        {feedback?.error && <p className="form-error full" role="alert">{feedback.error}</p>}
        {feedback?.message && <p className="form-message full" role="status">{feedback.message}</p>}
      </div>

      {sourceUrl && sourceImage && (
        <div className="crop-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) setSourceUrl(null);
        }}>
          <section className="crop-dialog profile-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-title">
            <p className="eyebrow">Profile photo</p>
            <h2 id="crop-title">Crop profile picture</h2>
            <p className="form-intro">Drag the image to adjust it. Original size: {sourceDimensions}.</p>
            <div className="profile-crop-frame">
              <canvas
                ref={canvasRef}
                className="crop-canvas"
                width={cropSize}
                height={cropSize}
                aria-label="Circular crop preview"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragStart.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
                }}
                onPointerMove={(event) => {
                  if (!dragStart.current) return;
                  updateOffset(
                    dragStart.current.offsetX + event.clientX - dragStart.current.x,
                    dragStart.current.offsetY + event.clientY - dragStart.current.y
                  );
                }}
                onPointerUp={() => { dragStart.current = null; }}
                onPointerCancel={() => { dragStart.current = null; }}
              />
            </div>
            <label className="field crop-zoom">
              <span>Zoom</span>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => {
                const nextZoom = Number(event.target.value);
                setZoom(nextZoom);
                updateOffset(offset.x, offset.y, nextZoom);
              }} />
            </label>
            <div className="crop-actions">
              <button className="secondary-button" type="button" disabled={isPending} onClick={() => setSourceUrl(null)}>Cancel</button>
              <button className="submit-button" type="button" disabled={isPending} onClick={saveCrop}>{isPending ? "Saving…" : "Save picture"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
