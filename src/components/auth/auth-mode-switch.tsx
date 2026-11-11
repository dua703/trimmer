"use client";

export function AuthModeSwitch({
  mode,
  onChange,
}: {
  mode: "login" | "register";
  onChange: (mode: "login" | "register") => void;
}) {
  return (
    <div
      className="grid grid-cols-2 rounded-full p-1"
      style={{ backgroundColor: "#FFD4C2" }}
      role="tablist"
      aria-label="Sign in or register"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "login"}
        onClick={() => onChange("login")}
        className="h-11 rounded-full text-sm font-semibold tracking-wide transition focus-visible:ring-2 focus-visible:ring-[#D4A07A] focus-visible:outline-none"
        style={
          mode === "login"
            ? { backgroundColor: "#4A2040", color: "#FFF6EF" }
            : { backgroundColor: "transparent", color: "#4A2C38" }
        }
      >
        Sign In
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "register"}
        onClick={() => onChange("register")}
        className="h-11 rounded-full text-sm font-semibold tracking-wide transition focus-visible:ring-2 focus-visible:ring-[#D4A07A] focus-visible:outline-none"
        style={
          mode === "register"
            ? { backgroundColor: "#4A2040", color: "#FFF6EF" }
            : { backgroundColor: "transparent", color: "#4A2C38" }
        }
      >
        Register
      </button>
    </div>
  );
}
