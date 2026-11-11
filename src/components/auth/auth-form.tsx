"use client";

import { useState } from "react";
import { AuthModeSwitch } from "@/components/auth/auth-mode-switch";
import { LoginForm } from "@/components/auth/login-form";
import { SignUpForm } from "@/components/auth/signup-form";

export function AuthForm({
  googleEnabled,
  googleStartUrl,
  googleError,
}: {
  googleEnabled: boolean;
  googleStartUrl: string;
  googleError?: string;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <p
        className="text-sm tracking-[0.26em] uppercase"
        style={{ color: "#C45C6A" }}
      >
        Trimmer beauty tech
      </p>
      <div className="mt-5">
        <AuthModeSwitch mode={mode} onChange={setMode} />
      </div>
      {googleError ? (
        <p className="mt-5 text-sm text-danger" role="alert">
          {googleError}
        </p>
      ) : null}
      <div className="mt-8">
        {mode === "login" ? (
          <LoginForm
            googleEnabled={googleEnabled}
            googleStartUrl={googleStartUrl}
            onShowSignUp={() => setMode("register")}
          />
        ) : (
          <SignUpForm
            googleEnabled={googleEnabled}
            googleStartUrl={googleStartUrl}
            onShowLogin={() => setMode("login")}
          />
        )}
      </div>
    </div>
  );
}
