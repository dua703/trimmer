"use client";

import { useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeGroomingAssessment,
  createGroomingAssessment,
  deleteGroomingAssessment,
} from "@/app/actions/assessments";
import { logoutExpressSession } from "@/app/actions/google-auth";
import type { ActionState } from "@/lib/module-action-state";
import type {
  GroomingAssessmentRecord,
  GroomingAssessmentStatistics
} from "@/lib/grooming-assessment";
import { ImageDropField } from "./image-drop-field";
import { StudioHeroFace } from "./studio-hero-face";

const categoryNames = {
  skin: "Skin",
  hair: "Hair",
  beard: "Beard"
} as const;

type CategoryKey = keyof typeof categoryNames;
type Workspace = "studio" | "manual" | "ai" | "results";
type ManualPhase = "categories" | "questions" | "review";

const categoryCopy = {
  skin: { kicker: "Skincare habits", detail: "Cleansing, moisture, and everyday care." },
  hair: { kicker: "Hair-care routine", detail: "Wash, trim, and styling habits." },
  beard: { kicker: "Beard-care habits", detail: "Shaping, products, and upkeep." }
} as const;

const aiCopy = {
  skin: { title: "Skin photo · acne-label estimates", hint: "Use a clear, front-facing photo in even light." },
  hair: { title: "Hair photo · hair-texture estimates", hint: "Keep your hair visible and avoid heavy filters." },
  beard: { title: "Beard photo · beard-presence estimates", hint: "Use a clear photo that shows your face." }
} as const;

const questions = {
  skin: [
    { key: "routineFrequency", label: "How often do you follow a skincare routine?", options: [["daily", "Daily"], ["weekly", "Weekly"], ["rarely", "Rarely"], ["never", "Never"]] },
    { key: "moisturizer", label: "How often do you moisturize?", options: [["daily", "Daily"], ["sometimes", "Sometimes"], ["never", "Never"]] },
    { key: "cleansing", label: "How often do you cleanse your face?", options: [["twice_daily", "Twice a day"], ["daily", "Daily"], ["occasionally", "Occasionally"], ["rarely", "Rarely"]] },
    { key: "sunscreen", label: "How often do you use sunscreen outdoors?", options: [["daily", "Daily"], ["sometimes", "Sometimes"], ["never", "Never"]] },
    { key: "mainConcern", label: "What is your main skincare routine concern?", options: [["routine", "Routine consistency"], ["hydration", "Hydration"], ["texture", "Texture appearance"], ["blemishes", "Visible blemishes"], ["redness", "Visible redness"], ["spots", "Visible spots"], ["other", "Other"]] }
  ],
  hair: [
    { key: "washFrequency", label: "How often do you wash your hair?", options: [["daily", "Daily"], ["two_to_three_weekly", "Two to three times a week"], ["weekly", "Weekly"], ["less_weekly", "Less than weekly"]] },
    { key: "stylingProducts", label: "How often do you use styling products?", options: [["often", "Often"], ["sometimes", "Sometimes"], ["rarely", "Rarely"], ["never", "Never"]] },
    { key: "trimFrequency", label: "How often do you trim your hair?", options: [["monthly", "Monthly"], ["every_two_to_three_months", "Every two to three months"], ["rarely", "Rarely"]] },
    { key: "preferredStyle", label: "What is your preferred hairstyle?", text: true },
    { key: "mainConcern", label: "What is your main hair grooming concern?", options: [["maintenance", "Maintenance"], ["dryness", "Dryness"], ["frizz", "Frizz"], ["styling", "Styling"], ["other", "Other"]] }
  ],
  beard: [
    { key: "trimFrequency", label: "How often do you trim your beard?", options: [["weekly", "Weekly"], ["every_two_to_three_weeks", "Every two to three weeks"], ["monthly", "Monthly"], ["rarely", "Rarely"]] },
    { key: "groomingProducts", label: "How often do you use beard grooming products?", options: [["regularly", "Regularly"], ["sometimes", "Sometimes"], ["never", "Never"]] },
    { key: "shapingFrequency", label: "How often do you shape your beard?", options: [["weekly", "Weekly"], ["monthly", "Monthly"], ["rarely", "Rarely"]] },
    { key: "preferredStyle", label: "What is your preferred beard style?", text: true },
    { key: "mainConcern", label: "What is your main beard grooming concern?", options: [["maintenance", "Maintenance"], ["neatness", "Neatness"], ["dryness", "Dryness"], ["length", "Length"], ["other", "Other"]] }
  ]
} as const;

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxBytes = 5 * 1024 * 1024;
const navItems: Array<{ id: Workspace; label: string }> = [
  { id: "studio", label: "Studio" },
  { id: "manual", label: "Manual Assessment" },
  { id: "ai", label: "AI Face Analysis" },
  { id: "results", label: "My Results" }
];

async function previewCreateAssessment(_state: ActionState, _formData: FormData): Promise<ActionState> {
  return { message: "Preview only — nothing was saved." };
}

async function previewAnalyzeAssessment(_state: ActionState, _formData: FormData): Promise<ActionState> {
  return { message: "Preview only — images were not sent for analysis." };
}

async function previewDeleteAssessment(_state: ActionState, _formData: FormData): Promise<ActionState> {
  return { message: "Preview only — nothing was deleted." };
}

function describeAiError(message: string) {
  const looksLikeDirectory = /directory|enoent|no such file|eacces|eisdir|image path|upload path/i.test(message);
  return {
    message,
    directoryHint: looksLikeDirectory
      ? "The response mentions a file path or directory. This page sends images in the request and does not create an image folder. Check the API and AI service logs for the exact path and status code."
      : undefined
  };
}

function fieldName(category: CategoryKey, key: string) {
  return `${category}.${key}`;
}

function optionLabel(category: CategoryKey, key: string, value: string) {
  const question = questions[category].find((item) => item.key === key);
  if (!question || "text" in question) return value;
  return question.options.find(([option]) => option === value)?.[1] || value;
}

export function GroomingAssessmentDashboard({
  assessments,
  statistics,
  preview = false
}: {
  assessments: GroomingAssessmentRecord[];
  statistics: GroomingAssessmentStatistics;
  preview?: boolean;
}) {
  const [workspace, setWorkspace] = useState<Workspace>("studio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [state, formAction, pending] = useActionState(preview ? previewCreateAssessment : createGroomingAssessment, undefined);
  const [aiState, aiFormAction, analyzing] = useActionState(preview ? previewAnalyzeAssessment : analyzeGroomingAssessment, undefined);
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);
  const [manualPhase, setManualPhase] = useState<ManualPhase>("categories");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [clientImageError, setClientImageError] = useState<string>();
  const [activeAiCategory, setActiveAiCategory] = useState<CategoryKey>("skin");
  const [imageReady, setImageReady] = useState<Record<CategoryKey, boolean>>({ skin: false, hair: false, beard: false });
  const router = useRouter();
  const aiError = aiState?.error ? describeAiError(aiState.error) : undefined;
  const questionList = useMemo(
    () => selectedCategories.flatMap((category) => questions[category].map((question) => ({ category, question }))),
    [selectedCategories]
  );
  const currentStep = questionList[questionIndex];
  const recentAssessments = useMemo(
    () => [...assessments].sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt)).slice(0, 2),
    [assessments]
  );

  useEffect(() => {
    if (!preview && state?.message) router.refresh();
  }, [preview, state?.message, router]);

  useEffect(() => {
    if (!preview && aiState?.message) router.refresh();
  }, [preview, aiState?.message, router]);

  const filteredAssessments = useMemo(() => assessments.filter((assessment) => {
    const categoryMatches = filterCategory === "all" || assessment.categories.includes(filterCategory as CategoryKey);
    const query = search.trim().toLocaleLowerCase();
    const searchMatches = !query || [
      assessment.summary,
      ...assessment.results.map((result) => `${result.question} ${result.answer}`),
      ...(assessment.predictions?.flatMap((result) => result.predictions.map(({ label }) => label)) || []),
      ...assessment.recommendations
    ].some((value) => value.toLocaleLowerCase().includes(query));
    return categoryMatches && searchMatches;
  }), [assessments, filterCategory, search]);

  function showWorkspace(next: Workspace) {
    setWorkspace(next);
    setMenuOpen(false);
  }

  function toggleCategory(category: CategoryKey) {
    setSelectedCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]);
    setManualPhase("categories");
    setQuestionIndex(0);
  }

  function beginManualQuestions() {
    if (selectedCategories.length === 0) return;
    setManualPhase("questions");
    setQuestionIndex(0);
  }

  function setAnswer(name: string, value: string) {
    setAnswers((current) => ({ ...current, [name]: value }));
  }

  function validateImages(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const selected: File[] = [];
    for (const category of ["skin", "hair", "beard"] as const) {
      const field = form.elements.namedItem(category);
      const file = field instanceof HTMLInputElement ? field.files?.[0] : undefined;
      if (!file || file.size === 0) continue;
      if (!allowedTypes.includes(file.type)) {
        event.preventDefault();
        setClientImageError("Choose a JPEG, PNG, or WebP image.");
        return;
      }
      if (file.size > maxBytes) {
        event.preventDefault();
        setClientImageError("Each assessment image must be 5 MB or smaller.");
        return;
      }
      selected.push(file);
    }
    if (selected.length === 0) {
      event.preventDefault();
      setClientImageError("Choose at least one image to analyze.");
      return;
    }
    setClientImageError(undefined);
  }

  const answeredCount = questionList.filter(({ category, question }) => answers[fieldName(category, question.key)]).length;

  return (
    <div className={`ga-studio${menuOpen ? " menu-open" : ""}`}>
      {menuOpen && <button className="ga-sidebar-backdrop" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className="ga-rail" aria-label="Studio navigation">
        <div className="ga-brand">
          <p className="brand-name">Trimmer</p>
          <p className="ga-brand-kicker">AI Grooming Studio</p>
        </div>
        <nav className="ga-rail-nav" id="ga-studio-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`ga-rail-link${workspace === item.id ? " active" : ""}`}
              type="button"
              aria-current={workspace === item.id ? "page" : undefined}
              onClick={() => showWorkspace(item.id)}
            >
              {item.label}
            </button>
          ))}
          {preview
            ? <span className="ga-rail-link">Your Profile</span>
            : <a className="ga-rail-link" href="/dashboard">Your Profile</a>}
        </nav>
        {preview
          ? <button className="ga-rail-link ga-signout" type="button">Sign Out</button>
          : <form action={logoutExpressSession}><button className="ga-rail-link ga-signout" type="submit">Sign Out</button></form>}
      </aside>

      <div className="ga-stage">
        <header className="ga-mobile-bar">
          <div className="ga-brand">
            <p className="brand-name">Trimmer</p>
            <p className="ga-brand-kicker">AI Grooming Studio</p>
          </div>
          <button className="secondary-button" type="button" aria-expanded={menuOpen} aria-controls="ga-studio-nav" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? "Close" : "Menu"}
          </button>
        </header>

        <section className={`ga-workspace${workspace === "studio" ? " active" : ""}`} hidden={workspace !== "studio"}>
          <div className="ga-cinematic">
            <div className="ga-cinematic-copy">
              <p className="eyebrow">Trimmer laboratory · 2500</p>
              <h1>Welcome to your future of grooming.</h1>
              <p className="form-intro">Intelligence meets your personal beauty ritual.</p>
              <div className="ga-launches">
                <button className="ga-launch" type="button" onClick={() => showWorkspace("manual")}>
                  <em>01</em>
                  <strong>Manual Assessment</strong>
                  <span>A guided ritual of optional questions.</span>
                </button>
                <button className="ga-launch ga-launch-ai" type="button" onClick={() => showWorkspace("ai")}>
                  <em>02</em>
                  <strong>AI Face Analysis</strong>
                  <span>Open the analysis chamber.</span>
                </button>
              </div>
              {recentAssessments[0] ? (
                <button className="ga-recent" type="button" onClick={() => showWorkspace("results")}>
                  <p className="eyebrow">Latest in the archive</p>
                  <strong>{new Date(recentAssessments[0].createdAt).toLocaleDateString()}</strong>
                  <span>{recentAssessments[0].assessmentType === "ai" ? "AI-assisted" : "Manual"} · {recentAssessments[0].categories.map((category) => categoryNames[category]).join(" · ")}</span>
                  <p>{recentAssessments[0].summary}</p>
                </button>
              ) : (
                <div className="ga-recent ga-recent-empty">
                  <p className="eyebrow">Archive standing by</p>
                  <strong>No assessments yet</strong>
                  <p>Begin a ritual or open the chamber. Your reports will appear here.</p>
                </div>
              )}
            </div>
            <div className="ga-orbit">
              <div className="ga-orbit-core" aria-hidden="true">
                <StudioHeroFace />
                <p>Facial mapping preview</p>
              </div>
              <article className="ga-orb ga-orb-1" aria-hidden="true">
                <strong>{statistics.total}</strong>
                <span>Saved</span>
              </article>
              <article className="ga-orb ga-orb-2" aria-hidden="true">
                <strong>{statistics.byCategory.skin}</strong>
                <span>Skin</span>
              </article>
              <article className="ga-orb ga-orb-3" aria-hidden="true">
                <strong>{statistics.byCategory.hair}</strong>
                <span>Hair</span>
              </article>
              <article className="ga-orb ga-orb-4" aria-hidden="true">
                <strong>{statistics.byCategory.beard}</strong>
                <span>Beard</span>
              </article>
            </div>
          </div>
        </section>

        <section className={`ga-workspace${workspace === "manual" ? " active" : ""}`} hidden={workspace !== "manual"}>
          <div className="ga-manual">
            <div className="ga-workspace-heading">
              <p className="eyebrow">Manual assessment</p>
              <h2>A private grooming ritual</h2>
              <p className="form-intro">Every question is optional. Choose a category, then move through one step at a time.</p>
            </div>

            {manualPhase === "categories" && (
              <div className="ga-manual-select">
                <div className="ga-category-column">
                  {(["skin", "hair", "beard"] as const).map((category) => (
                    <label className={`ga-category-card ga-cat-${category}${selectedCategories.includes(category) ? " selected" : ""}`} key={category}>
                      <input
                        type="checkbox"
                        name="category-picker"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      <span className="ga-category-icon" aria-hidden="true"><CategoryIcon name={category} /></span>
                      <div>
                        <strong>{categoryNames[category]}</strong>
                        <em>{categoryCopy[category].kicker}</em>
                        <span>{categoryCopy[category].detail}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="ga-step-actions">
                  <button className="text-button assessment-select-all" type="button" onClick={() => setSelectedCategories(["skin", "hair", "beard"])}>
                    Complete grooming assessment · Select all
                  </button>
                  {selectedCategories.length > 0 && (
                    <button className="text-button" type="button" onClick={() => setSelectedCategories([])}>Clear selection</button>
                  )}
                  <button className="submit-button" type="button" disabled={selectedCategories.length === 0} onClick={beginManualQuestions}>
                    Begin questions
                  </button>
                </div>
              </div>
            )}

            <form action={formAction} hidden={manualPhase === "categories"}>
              {selectedCategories.map((category) => (
                <input key={category} type="hidden" name="categories" value={category} />
              ))}
              {questionList.map(({ category, question }, index) => {
                const name = fieldName(category, question.key);
                const visible = manualPhase === "questions" && index === questionIndex;
                return (
                  <div className="ga-question-pane" hidden={!visible} key={name}>
                    <div className="ga-progress-meta">
                      <span>{categoryNames[category]} · {index + 1} of {questionList.length}</span>
                      <span>{answeredCount} answered · all optional</span>
                    </div>
                    <div className="ga-progress-track" aria-hidden="true">
                      <span className="ga-progress-fill" style={{ width: `${Math.round(((index + 1) / Math.max(questionList.length, 1)) * 100)}%` }} />
                    </div>
                    <h3>{question.label}</h3>
                    {"text" in question ? (
                      <label className="field">
                        <span>Optional answer</span>
                        <input
                          name={name}
                          maxLength={80}
                          placeholder="Optional"
                          value={answers[name] || ""}
                          onChange={(event) => setAnswer(name, event.target.value)}
                        />
                      </label>
                    ) : (
                      <>
                        <input type="hidden" name={name} value={answers[name] || ""} />
                        <div className="ga-choice-grid">
                          {question.options.map(([value, label]) => (
                            <button
                              className={`ga-choice${answers[name] === value ? " selected" : ""}`}
                              type="button"
                              key={value}
                              onClick={() => setAnswer(name, value)}
                            >
                              {label}
                            </button>
                          ))}
                          <button className={`ga-choice ga-choice-skip${answers[name] ? "" : " selected"}`} type="button" onClick={() => setAnswer(name, "")}>
                            Skip this question
                          </button>
                        </div>
                      </>
                    )}
                    <div className="ga-step-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          if (index === 0) setManualPhase("categories");
                          else setQuestionIndex(index - 1);
                        }}
                      >
                        Previous
                      </button>
                      <button
                        className="submit-button"
                        type="button"
                        onClick={() => {
                          if (index === questionList.length - 1) setManualPhase("review");
                          else setQuestionIndex(index + 1);
                        }}
                      >
                        {index === questionList.length - 1 ? "Review answers" : "Next"}
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="ga-review" hidden={manualPhase !== "review"}>
                <div className="ga-progress-meta">
                  <span>Final review</span>
                  <span>{answeredCount} of {questionList.length} answered</span>
                </div>
                <ul className="ga-review-list">
                  {questionList.map(({ category, question }) => {
                    const name = fieldName(category, question.key);
                    const value = answers[name];
                    return (
                      <li key={name}>
                        <span>{categoryNames[category]} · {question.label}</span>
                        <strong>{value ? ("text" in question ? value : optionLabel(category, question.key, value)) : "Skipped"}</strong>
                      </li>
                    );
                  })}
                </ul>
                {state?.error && <p className="form-error" role="alert">{state.error}</p>}
                {state?.message && <p className="form-message" role="status">{state.message}</p>}
                {state?.assessment && <AssessmentReport report={state.assessment} />}
                <div className="ga-step-actions">
                  <button className="secondary-button" type="button" onClick={() => { setManualPhase("questions"); setQuestionIndex(Math.max(questionList.length - 1, 0)); }}>
                    Previous
                  </button>
                  <button className="submit-button" type="submit" disabled={pending || selectedCategories.length === 0}>
                    {pending ? "Saving assessment…" : "Save Assessment"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className={`ga-workspace${workspace === "ai" ? " active" : ""}`} hidden={workspace !== "ai"}>
          <div className="ga-ai">
            <div className="ga-workspace-heading">
              <p className="eyebrow">Analysis chamber</p>
              <h2>AI Face Analysis</h2>
              <p className="form-intro">
                Upload a clear photo for one or more categories. Images are processed temporarily and never stored.
                Scanning appears only while analysis is running.
              </p>
            </div>
            <form className="ga-ai-layout" action={aiFormAction} onSubmit={validateImages}>
              <div className="ga-chamber-stage">
                {(["skin", "hair", "beard"] as const).map((category) => (
                  <div hidden={activeAiCategory !== category} key={category}>
                    <ImageDropField
                      name={category}
                      title={aiCopy[category].title}
                      hint={aiCopy[category].hint}
                      disabled={analyzing}
                      scanning={analyzing && activeAiCategory === category}
                      onReadyChange={(ready) => setImageReady((current) => ({ ...current, [category]: ready }))}
                    />
                  </div>
                ))}
              </div>
              <aside className="ga-ai-panel">
                <p className="eyebrow">Chamber channels</p>
                <div className="ga-ai-channels">
                  {(["skin", "hair", "beard"] as const).map((category) => (
                    <button
                      className={`ga-channel${activeAiCategory === category ? " active" : ""}${imageReady[category] ? " ready" : ""}`}
                      type="button"
                      key={category}
                      onClick={() => setActiveAiCategory(category)}
                    >
                      <strong>{categoryNames[category]}</strong>
                      <span>{imageReady[category] ? "Image ready" : "Awaiting photo"}</span>
                    </button>
                  ))}
                </div>
                <p className="form-intro">JPEG, PNG, or WebP; maximum 5 MB per image. The models provide cosmetic estimates only, not medical advice or a diagnosis.</p>
                {clientImageError && <p className="form-error" role="alert">{clientImageError}</p>}
                {aiError && (
                  <div className="form-error ga-error-block" role="alert">
                    <p>{aiError.message}</p>
                    {aiError.directoryHint && <p>{aiError.directoryHint}</p>}
                  </div>
                )}
                {aiState?.message && <p className="form-message" role="status">{aiState.message}</p>}
                {analyzing && (
                  <div className="ga-progress" role="status">
                    <div className="ga-progress-track" aria-hidden="true"><span className="ga-progress-bar" /></div>
                    <p>Analyzing images… this may take a few minutes on first use</p>
                  </div>
                )}
                <div className="ga-consent-panel">
                  <label className="ga-consent">
                    <input type="checkbox" name="consent" value="true" required disabled={analyzing} />
                    <span>
                      <strong>Processing consent</strong>
                      I consent to temporarily processing the selected image(s) to generate these estimates.
                    </span>
                  </label>
                  <button className="submit-button ga-analyze-button" type="submit" disabled={analyzing}>
                    {analyzing ? "Analyzing images… this may take a few minutes on first use" : "Analyze and save AI assessment"}
                  </button>
                </div>
                <p className="notice">
                  Skin estimates cover five acne labels and are not clinically validated. Hair estimates cover hair texture only.
                  Beard estimates detect presence, not beard style. Model confidence is not a measure of real-world accuracy.
                </p>
                {aiState?.assessment && <AssessmentReport report={aiState.assessment} />}
              </aside>
            </form>
          </div>
        </section>

        <section className={`ga-workspace${workspace === "results" ? " active" : ""}`} hidden={workspace !== "results"}>
          <div className="ga-archive">
            <div className="ga-workspace-heading">
              <p className="eyebrow">Assessment archive</p>
              <h2>My Results</h2>
              <p className="form-intro">A private library of your grooming reports. Search, filter, and expand any record.</p>
            </div>
            <div className="ga-history-filters">
              <label className="field">
                <span>Filter by category</span>
                <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
                  <option value="all">All categories</option>
                  {(["skin", "hair", "beard"] as const).map((category) => <option key={category} value={category}>{categoryNames[category]}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Search your results</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search answers or suggestions" />
              </label>
            </div>
            {filteredAssessments.length === 0
              ? <p className="empty-state ga-empty">{assessments.length === 0 ? "No assessments yet. Begin a ritual or open the analysis chamber." : "No assessments match those filters."}</p>
              : <div className="grooming-assessment-list">{filteredAssessments.map((assessment) => (
                <AssessmentHistoryItem assessment={assessment} key={assessment.id} preview={preview} />
              ))}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function CategoryIcon({ name }: { name: CategoryKey }) {
  if (name === "hair") {
    return (
      <svg viewBox="0 0 32 32" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M6 20c3-8 6-12 10-12s7 4 10 12" />
        <path d="M8 24c2.5-6 5-9 8-9s5.5 3 8 9" />
      </svg>
    );
  }
  if (name === "beard") {
    return (
      <svg viewBox="0 0 32 32" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M8 13c0 8 3.5 14 8 14s8-6 8-14" />
        <path d="M10 13c.5-3 3-5 6-5s5.5 2 6 5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="16" cy="13" r="6" />
      <path d="M8 27c1.5-5 4.5-8 8-8s6.5 3 8 8" />
    </svg>
  );
}

function AssessmentReport({ report }: { report: NonNullable<ActionState>["assessment"] }) {
  if (!report) return null;
  return (
    <section className="assessment-report ga-report" aria-label="Assessment result">
      <h3>{report.assessmentType === "ai" ? "Your AI-assisted summary" : "Your self-reported summary"}</h3>
      <p>{report.summary}</p>
      {report.results.length > 0 && <ul>{report.results.map((result, index) => (
        <li key={`${result.category}-${index}`}><strong>{result.question}:</strong> {result.answer}</li>
      ))}</ul>}
      {report.predictions?.map((result) => (
        <div className="assessment-prediction ga-prediction" key={`${result.category}-${result.modelId}`}>
          <h4>{categoryNames[result.category]} model estimates</h4>
          <ul className="ga-prediction-list">{result.predictions.map((prediction) => (
            <li key={prediction.label}>
              <div className="ga-meter-label">
                <strong>{prediction.label}</strong>
                <span>
                  {Math.round(prediction.score * 100)}% model confidence
                  {result.category === "skin"
                    ? (prediction.detected ? " · above model threshold" : " · below model threshold")
                    : (prediction.detected ? " · top model estimate" : "")}
                </span>
              </div>
              <span className="ga-meter-track" aria-hidden="true">
                <span className="ga-meter-fill" style={{ width: `${Math.max(4, Math.round(prediction.score * 100))}%` }} />
              </span>
            </li>
          ))}</ul>
        </div>
      ))}
      <h4>Routine suggestions</h4>
      <ul>{report.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul>
    </section>
  );
}

function AssessmentHistoryItem({ assessment, preview = false }: { assessment: GroomingAssessmentRecord; preview?: boolean }) {
  const [state, action, pending] = useActionState(preview ? previewDeleteAssessment : deleteGroomingAssessment, undefined);
  const router = useRouter();

  useEffect(() => {
    if (!preview && state?.message) router.refresh();
  }, [preview, state?.message, router]);

  return (
    <article className="grooming-history-card ga-history-card">
      <header>
        <div>
          <div className="ga-badge-row">
            <span className={`ga-badge${assessment.assessmentType === "ai" ? " ga-badge-ai" : ""}`}>
              {assessment.assessmentType === "ai" ? "AI-assisted" : "Manual"}
            </span>
            {assessment.categories.map((category) => (
              <span className="ga-badge" key={category}>{categoryNames[category]}</span>
            ))}
          </div>
          <h3>{new Date(assessment.createdAt).toLocaleDateString()}</h3>
        </div>
        <form action={action}>
          <input type="hidden" name="assessmentId" value={assessment.id} />
          <button className="text-button danger-button" type="submit" disabled={pending}>{pending ? "Deleting…" : "Delete"}</button>
        </form>
      </header>
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      {state?.message && <p className="form-message" role="status">{state.message}</p>}
      <p>{assessment.summary}</p>
      <details>
        <summary>View answers and suggestions</summary>
        <ul>{assessment.results.map((result, index) => (
          <li key={`${result.category}-${index}`}><strong>{result.question}:</strong> {result.answer}</li>
        ))}</ul>
        {assessment.predictions?.map((result) => (
          <div className="ga-prediction" key={`${result.category}-${result.modelId}`}>
            <h4>{categoryNames[result.category]} model estimates</h4>
            <ul className="ga-prediction-list">{result.predictions.map((prediction) => (
              <li key={prediction.label}>
                <div className="ga-meter-label">
                  <strong>{prediction.label}</strong>
                  <span>
                    {Math.round(prediction.score * 100)}% confidence
                    {result.category === "skin"
                      ? (prediction.detected ? " · above model threshold" : " · below model threshold")
                      : (prediction.detected ? " · top model estimate" : "")}
                  </span>
                </div>
                <span className="ga-meter-track" aria-hidden="true">
                  <span className="ga-meter-fill" style={{ width: `${Math.max(4, Math.round(prediction.score * 100))}%` }} />
                </span>
              </li>
            ))}</ul>
          </div>
        ))}
        <h4>Routine suggestions</h4>
        <ul>{assessment.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul>
      </details>
    </article>
  );
}
