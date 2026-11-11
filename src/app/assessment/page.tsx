import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isRedirectError } from "@/lib/backend";
import {
  getGroomingAssessmentStatistics,
  getGroomingAssessments,
} from "@/lib/grooming-assessment";
import { GroomingAssessmentDashboard } from "./grooming-assessment-dashboard";
import "./module-3.css";

export default function AssessmentPage() {
  return (
    <Suspense fallback={<AssessmentFallback />}>
      <Assessment />
    </Suspense>
  );
}

async function Assessment() {
  await connection();

  let assessments;
  let statistics;

  try {
    [assessments, statistics] = await Promise.all([
      getGroomingAssessments(),
      getGroomingAssessmentStatistics(),
    ]);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return (
      <main className="min-h-full bg-cream px-6 py-16 text-muted">
        Signed in, but the assessment service is unavailable.
      </main>
    );
  }

  if (!assessments || !statistics) {
    redirect("/");
  }

  return (
    <main className="dashboard-shell assessment-page">
      <GroomingAssessmentDashboard
        assessments={assessments}
        statistics={statistics}
      />
    </main>
  );
}

function AssessmentFallback() {
  return (
    <main className="min-h-full bg-cream px-6 py-16 text-muted">
      Loading the grooming studio…
    </main>
  );
}
