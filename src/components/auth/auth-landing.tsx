import { AuthForm } from "@/components/auth/auth-form";
import { BrandPanel } from "@/components/auth/brand-panel";

export function AuthLanding({
  googleEnabled,
  googleStartUrl,
  googleError,
}: {
  googleEnabled: boolean;
  googleStartUrl: string;
  googleError?: string;
}) {
  return (
    <div
      className="relative min-h-dvh lg:flex lg:h-dvh lg:overflow-hidden"
      style={{ backgroundColor: "#FFF6EF" }}
    >
      <BrandPanel />
      <section
        className="relative z-10 flex min-h-0 flex-1 items-start overflow-y-auto px-6 py-8 sm:px-12 lg:h-dvh lg:px-14 lg:py-8"
        style={{
          background: "linear-gradient(180deg, #FFF6EF 0%, #FFE8DC 50%, #FFF4EC 100%)",
        }}
      >
        <div className="my-auto w-full max-w-[440px]">
          <AuthForm
            googleEnabled={googleEnabled}
            googleStartUrl={googleStartUrl}
            googleError={googleError}
          />
        </div>
      </section>
    </div>
  );
}
