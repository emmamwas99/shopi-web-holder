"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { Camera } from "lucide-react";
import { useCreateStore } from "@/stores/create";
import { useMediaUpload } from "@/features/create/hooks/useMediaUpload";
import { SHOW_TIKTOK_CREATE_OPTIONS } from "@/features/create/utils/tiktokAvailability";
import { CreateDraftDocument } from "@/types/__generated__/graphql";

export function StepPickMedia() {
  const { draftId, setDraftId, setContentType, setStep, setError, error } =
    useCreateStore();

  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageCameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      const lang = window.location.pathname.split("/")[1] || "en";
      router.push(`/${lang}/for-you`);
    }
  }

  const [createDraft] = useMutation(CreateDraftDocument);
  const { startImageUpload, startVideoUpload } = useMediaUpload();

  async function ensureDraft(type: "image" | "video"): Promise<string> {
    if (draftId) return draftId;
    const { data, error: createError } = await createDraft({
      variables: { input: { type: type === "video" ? "VIDEO" : "IMAGE" } },
    });
    if (createError || !data?.createDraft) {
      throw new Error(createError?.message ?? "Failed to create draft");
    }
    const id = data.createDraft.id;
    setDraftId(id);
    return id;
  }

  async function handleFiles(files: FileList, kind: "image" | "video") {
    if (!files.length || creating) return;
    setCreating(true);
    setError(null);

    try {
      // Create draft first (fast — just a DB insert)
      const did = await ensureDraft(kind);
      setContentType(kind);

      // Fire-and-forget all uploads — they run in background
      const fileList = Array.from(files).slice(0, kind === "video" ? 1 : 10);
      fileList.forEach((file, i) => {
        if (kind === "image") {
          startImageUpload(file, did, i);
        } else {
          startVideoUpload(file, did);
        }
      });

      // Skip media review — go straight to edit details (TikTok style)
      setStep("edit");
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  }

  function handleTiktokImport() {
    const lang = window.location.pathname.split("/")[1] || "en";
    router.push(`/${lang}/upload/tiktok`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface text-muted active:opacity-60 transition-opacity shrink-0"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <h1
          className="font-semibold"
          style={{
            fontSize: "var(--text-xl)",
            color: "rgb(var(--color-text))",
          }}
        >
          New Post
        </h1>
      </div>

      {/* Choice cards */}
      <div className="flex-1 flex flex-col gap-3 px-4 justify-center pb-8">
        {/* Video */}
        <button
          className="relative overflow-hidden rounded-2xl active:scale-[0.98] transition-transform"
          style={{
            height: 160,
            background:
              "linear-gradient(135deg, rgb(var(--brand-primary)), rgb(var(--brand-highlight)))",
            boxShadow: "0 8px 24px rgb(var(--brand-primary) / 0.35)",
            opacity: creating ? 0.6 : 1,
          }}
          onClick={() => videoInputRef.current?.click()}
          disabled={creating}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect
                x="2"
                y="5"
                width="15"
                height="14"
                rx="2"
                fill="white"
                fillOpacity={0.25}
                stroke="white"
                strokeWidth="1.8"
              />
              <path
                d="M17 9l5-3v12l-5-3V9Z"
                fill="white"
                fillOpacity={0.25}
                stroke="white"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="font-semibold"
              style={{ fontSize: "var(--text-lg)" }}
            >
              Video
            </span>
            <span style={{ fontSize: "var(--text-sm)", opacity: 0.85 }}>
              MP4, MOV up to 10 min
            </span>
          </div>
          <div
            className="absolute -top-6 -right-6 rounded-full opacity-20"
            style={{ width: 120, height: 120, background: "white" }}
          />
          <div
            className="absolute -bottom-10 -left-4 rounded-full opacity-10"
            style={{ width: 140, height: 140, background: "white" }}
          />
        </button>

        {/* Photos */}
        <button
          className="relative overflow-hidden rounded-2xl active:scale-[0.98] transition-transform"
          style={{
            height: 160,
            background:
              "linear-gradient(135deg, rgb(var(--brand-accent)), rgb(var(--brand-primary)))",
            boxShadow: "0 8px 24px rgb(var(--brand-accent) / 0.3)",
            opacity: creating ? 0.6 : 1,
          }}
          onClick={() => imageInputRef.current?.click()}
          disabled={creating}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect
                x="2"
                y="2"
                width="20"
                height="20"
                rx="4"
                fill="white"
                fillOpacity={0.25}
                stroke="white"
                strokeWidth="1.8"
              />
              <circle cx="8.5" cy="8.5" r="2" fill="white" fillOpacity={0.8} />
              <path
                d="M2 15l5-5 4 4 3-3 8 8"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="font-semibold"
              style={{ fontSize: "var(--text-lg)" }}
            >
              Photos
            </span>
            <span style={{ fontSize: "var(--text-sm)", opacity: 0.85 }}>
              Up to 10 images
            </span>
          </div>
          <div
            className="absolute -top-6 -right-6 rounded-full opacity-20"
            style={{ width: 120, height: 120, background: "white" }}
          />
        </button>

        {/* Camera */}
        <button
          className="relative overflow-hidden rounded-2xl active:scale-[0.98] transition-transform"
          style={{
            height: 72,
            backgroundColor: "rgb(var(--color-bg-subtle))",
            border: "1px solid rgb(var(--color-border))",
            opacity: creating ? 0.6 : 1,
          }}
          onClick={() => imageCameraInputRef.current?.click()}
          disabled={creating}
        >
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            <Camera size={24} style={{ color: "rgb(var(--color-text))" }} />
            <span
              className="font-semibold"
              style={{
                fontSize: "var(--text-md)",
                color: "rgb(var(--color-text))",
              }}
            >
              Take photo
            </span>
          </div>
        </button>

        {SHOW_TIKTOK_CREATE_OPTIONS && (
          <button
            type="button"
            onClick={handleTiktokImport}
            className="rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
            style={{
              backgroundColor: "rgb(var(--color-bg-subtle))",
              border: "1px solid rgb(var(--color-border))",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgb(var(--color-bg-elevated))" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.22 8.22 0 0 0 4.82 1.56V6.8a4.85 4.85 0 0 1-1.05-.11Z"
                  fill="rgb(var(--color-text-muted))"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-medium"
                style={{
                  fontSize: "var(--text-sm)",
                  color: "rgb(var(--color-text))",
                }}
              >
                Import from TikTok
              </p>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "rgb(var(--color-text-muted))",
                }}
              >
                Paste a link or reuse a saved video
              </p>
            </div>
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "rgb(var(--color-text-muted))",
              }}
            >
              →
            </span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mx-4 mb-4 rounded-xl px-4 py-3"
          style={{
            backgroundColor: "rgb(var(--color-error) / 0.08)",
            border: "1px solid rgb(var(--color-error) / 0.2)",
            color: "rgb(var(--color-error))",
            fontSize: "var(--text-sm)",
          }}
        >
          {error}
        </div>
      )}

      {/* Creating overlay — only shows for the brief draft creation, not upload */}
      {creating && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center"
          style={{ backgroundColor: "rgb(var(--color-bg) / 0.6)" }}
        >
          <MiniSpinner />
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files, "image")}
      />
      <input
        ref={imageCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files, "image")}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files, "video")}
      />
    </div>
  );
}

function MiniSpinner() {
  return (
    <svg
      className="animate-spin"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="rgb(var(--brand-primary) / 0.2)"
        strokeWidth="3"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="rgb(var(--brand-primary))"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
