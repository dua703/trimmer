import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { AuthLanding } from "@/components/auth/auth-landing";
import {
  ACCESS_TOKEN_COOKIE,
  getAuthApiUrl,
  getGoogleStartUrl,
  googleHandoffErrorMessage,
  isGoogleAuthConfigured,
} from "@/lib/auth-api";
import { isRedirectError } from "@/lib/backend";

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<LandingFallback />}>
      <HomeGate searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeGate({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const params = await searchParams;

  try {
    const expressToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
    if (expressToken) {
      redirect("/dashboard");
    }

    const session = await auth();
    if (session?.user) {
      redirect("/dashboard");
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
  }

  let googleEnabled = false;
  if (isGoogleAuthConfigured()) {
    try {
      const response = await fetch(`${getAuthApiUrl()}/auth/providers`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const providers = (await response.json()) as { google?: boolean };
        googleEnabled = providers.google === true;
      }
    } catch {
      googleEnabled = false;
    }
  }

  return (
    <AuthLanding
      googleEnabled={googleEnabled}
      googleStartUrl={getGoogleStartUrl()}
      googleError={googleHandoffErrorMessage(params.error)}
    />
  );
}

function LandingFallback() {
  return (
    <div className="min-h-dvh lg:flex" style={{ backgroundColor: "#FFF6EF" }}>
      <div className="min-h-[52vh] lg:min-h-dvh lg:w-[47%]" style={{ backgroundColor: "#4A2040" }} />
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-muted">
        Preparing your space…
      </div>
    </div>
  );
}
