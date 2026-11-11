import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { logout } from "@/lib/auth-contract";
import { getAccessToken } from "@/lib/auth-session";
import { isRedirectError } from "@/lib/backend";
import { prisma } from "@/lib/prisma";
import { getAssessments, getProfile } from "@/lib/profile";
import { ProfileManager } from "./profile-manager";
import "./module-2.css";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await connection();

  const expressToken = await getAccessToken();
  if (expressToken) {
    return <ExpressDashboard />;
  }

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return (
      <main className="min-h-full bg-cream px-6 py-16 text-muted">
        Signed in, but the profile service is unavailable.
      </main>
    );
  }

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-full bg-cream px-6 py-10 sm:px-12">
      <header className="mx-auto flex max-w-4xl items-center justify-between">
        <p className="font-serif text-3xl text-plum">Trimmer</p>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-line px-4 py-2 text-sm text-plum transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#E8D5C4] focus-visible:outline-none"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mx-auto mt-16 max-w-4xl rounded-[2rem] border border-line bg-white/80 p-8 shadow-[0_20px_60px_rgba(59,36,54,0.06)]">
        <p className="text-sm tracking-[0.22em] text-rose-gold uppercase">
          Module 1
        </p>
        <h1 className="mt-3 font-serif text-4xl text-plum">
          Welcome, {user.name ?? "guest"}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted">
          You are signed in with email. The profile dashboard and grooming studio
          use the Trimmer API session cookie, which email login does not issue yet.
        </p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <Info label="Email" value={user.email} />
          <Info
            label="Joined"
            value={user.createdAt.toLocaleDateString()}
          />
        </dl>
      </section>
    </main>
  );
}

async function ExpressDashboard() {
  let profileResponse;
  let assessments;

  try {
    [profileResponse, assessments] = await Promise.all([
      getProfile(),
      getAssessments(),
    ]);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return (
      <main className="min-h-full bg-cream px-6 py-16 text-muted">
        Signed in, but the profile service is unavailable.
      </main>
    );
  }

  if (!profileResponse?.profile) {
    redirect("/");
  }

  return (
    <main className="dashboard-shell profile-page">
      <ProfileManager
        profile={profileResponse.profile}
        assessments={assessments}
      />
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream px-5 py-4">
      <dt className="text-xs tracking-[0.16em] text-rose-gold uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-plum">{value}</dd>
    </div>
  );
}

function DashboardFallback() {
  return (
    <main className="min-h-full bg-cream px-6 py-16 text-muted">
      Loading your profile…
    </main>
  );
}
