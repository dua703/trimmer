"use client";

import { useState } from "react";

export function GoogleRecoveryKeys({ keys }: { keys: string[] }) {
  const [copied, setCopied] = useState(false);

  return (
    <main
      className="flex min-h-dvh items-center justify-center px-6 py-16"
      style={{ backgroundColor: "#FFF6EF" }}
    >
      <section className="w-full max-w-[440px] rounded-[2rem] border border-line bg-white/80 p-8 shadow-[0_20px_60px_rgba(59,36,54,0.06)]">
        <p
          className="text-sm tracking-[0.26em] uppercase"
          style={{ color: "#C45C6A" }}
        >
          Account created
        </p>
        <h1
          className="mt-4 font-serif text-4xl leading-tight"
          style={{ color: "#4A2040" }}
        >
          Save your recovery keys
        </h1>
        <p className="mt-3 text-[15px] leading-7" style={{ color: "#7A534C" }}>
          These keys can reset your password. Save them now; this is the only
          time they will be shown.
        </p>
        <ol className="mt-6 space-y-2 font-mono text-sm" style={{ color: "#4A2040" }}>
          {keys.map((key) => (
            <li
              key={key}
              className="rounded-2xl bg-cream px-4 py-3"
            >
              {key}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs leading-5 text-muted">
          Keep these keys private. Each one can be reused to reset your
          password.
        </p>
        <button
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full border text-sm font-semibold"
          style={{
            borderColor: "#F0CFC3",
            backgroundColor: "#FFFFFF",
            color: "#4A2040",
          }}
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(keys.join("\n")).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          {copied ? "Copied" : "Copy all keys"}
        </button>
        <a
          className="mt-3 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold"
          style={{ backgroundColor: "#4A2040", color: "#FFF6EF" }}
          href="/dashboard"
        >
          Continue to your account
        </a>
      </section>
    </main>
  );
}
