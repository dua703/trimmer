"use client";

import { useId, useState } from "react";

type AuthFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "date";
  autoComplete?: string;
  error?: string;
  revealable?: boolean;
  required?: boolean;
  max?: string;
  hint?: string;
};

export function AuthField({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  error,
  revealable = false,
  required = true,
  max,
  hint,
}: AuthFieldProps) {
  const errorId = useId();
  const hintId = useId();
  const [visible, setVisible] = useState(false);
  const inputType = revealable ? (visible ? "text" : "password") : type;
  const describedBy = [
    hint ? hintId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium"
        style={{ color: "#4A2C38" }}
      >
        {label}
        {required ? null : (
          <span className="ml-1 font-normal text-muted">(optional)</span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={inputType}
          autoComplete={autoComplete}
          required={required}
          aria-required={required}
          max={max}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="h-12 w-full rounded-2xl border border-line bg-white/90 px-4 text-plum shadow-[0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-[#C2B0A5] focus-visible:border-coral focus-visible:ring-2 focus-visible:ring-peach"
        />
        {revealable ? (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-medium transition hover:bg-[#FFF6EF] focus-visible:ring-2 focus-visible:ring-[#E8D5C4] focus-visible:outline-none"
            style={{ color: "#4A2040" }}
            aria-controls={id}
            aria-pressed={visible}
            aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          >
            {visible ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs leading-5 text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
