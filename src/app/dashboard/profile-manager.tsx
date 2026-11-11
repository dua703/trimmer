"use client";

import { useActionState, useState } from "react";
import {
  deleteAssessment,
  saveAssessment,
  updateProfile,
} from "@/app/actions/profile";
import { logoutExpressSession } from "@/app/actions/google-auth";
import type { ActionState } from "@/lib/module-action-state";
import type { Assessment, Profile } from "@/lib/profile";
import { getSixteenYearsAgoDate, sanitizeNameInput } from "@/lib/validation";
import { AvatarUploader } from "./avatar-uploader";

const languageLabels = { en: "English", ur: "Urdu" };

type DashboardSection = "profile" | "account" | "routine" | "settings" | "results";

const sectionItems: Array<{ id: DashboardSection; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "routine", label: "Routine" },
  { id: "settings", label: "Settings" },
  { id: "results", label: "Saved Results" }
];

async function previewUpdateProfile(_state: ActionState, _formData: FormData): Promise<ActionState> {
  return { message: "Preview only — nothing was saved." };
}

async function previewSaveAssessment(_state: ActionState, _formData: FormData): Promise<ActionState> {
  return { message: "Preview only — nothing was saved." };
}

async function previewDeleteAssessment(_formData: FormData) {
  return;
}

export function ProfileManager({
  profile,
  assessments,
  preview = false
}: {
  profile: Profile;
  assessments: Assessment[];
  preview?: boolean;
}) {
  const [section, setSection] = useState<DashboardSection>("profile");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileState, profileAction, profilePending] = useActionState(preview ? previewUpdateProfile : updateProfile, undefined);
  const [assessmentState, assessmentAction, assessmentPending] = useActionState(preview ? previewSaveAssessment : saveAssessment, undefined);
  const [assessmentResults, setAssessmentResults] = useState([{ label: "", value: "" }]);
  const [leftId, setLeftId] = useState(assessments[0]?.id || "");
  const [rightId, setRightId] = useState(assessments[1]?.id || assessments[0]?.id || "");
  const left = assessments.find((item) => item.id === leftId);
  const right = assessments.find((item) => item.id === rightId);
  const resultLabels = [...new Set([...(left?.results || []), ...(right?.results || [])].map((item) => item.label))];
  const leftValues = new Map((left?.results || []).map((item) => [item.label, item.value]));
  const rightValues = new Map((right?.results || []).map((item) => [item.label, item.value]));
  const fullName = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ");

  function showSection(next: DashboardSection) {
    setSection(next);
    setMenuOpen(false);
  }


  return (
    <div className={`profile-layout${menuOpen ? " menu-open" : ""}`}>
      {menuOpen && <button className="profile-sidebar-backdrop" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className="profile-sidebar" aria-label="Dashboard sections">
        <div className="profile-brand">
          <p className="brand-name">Trimmer</p>
          <p className="profile-brand-kicker">Personal grooming</p>
        </div>
        <nav className="profile-sidebar-nav" id="profile-sidebar-nav">
          {sectionItems.map((item) => (
            <button
              key={item.id}
              className={`profile-sidebar-link${section === item.id ? " active" : ""}`}
              type="button"
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => showSection(item.id)}
            >
              {item.label}
            </button>
          ))}
          {preview
            ? <span className="profile-sidebar-link">Grooming Assessment</span>
            : <a className="profile-sidebar-link" href="/assessment">Grooming Assessment</a>}
        </nav>
        {preview
          ? <button className="profile-sidebar-link profile-signout" type="button">Sign Out</button>
          : <form action={logoutExpressSession}><button className="profile-sidebar-link profile-signout" type="submit">Sign Out</button></form>}
      </aside>

      <div className="profile-main">
        <header className="profile-mobile-bar">
          <div className="profile-brand">
            <p className="brand-name">Trimmer</p>
            <p className="profile-brand-kicker">Personal grooming</p>
          </div>
          <button className="secondary-button" type="button" aria-expanded={menuOpen} aria-controls="profile-sidebar-nav" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? "Close" : "Menu"}
          </button>
        </header>

        {section === "profile" && (
          <section className="profile-hero">
            <p className="eyebrow">Your grooming profile</p>
            <h1>Welcome, {profile.firstName}</h1>
            <p className="form-intro">Your Trimmer identity at a glance. Use the sidebar to update account details, routine, settings, or saved results.</p>
            <div className="profile-identity">
              <AvatarUploader firstName={profile.firstName} profilePicture={profile.profilePicture} preview={preview} />
              <div className="profile-identity-text">
                <p className="profile-full-name">{fullName}</p>
                <p className="profile-username">@{profile.username}</p>
                <p className="profile-auth">Signed in with {profile.authProvider}</p>
                <p className="profile-auth">{profile.email}</p>
              </div>
            </div>
          </section>
        )}

        <form action={profileAction} className="profile-form">
          <section className="profile-panel" hidden={section !== "account"}>
            <p className="eyebrow">Account</p>
            <h2>Personal information</h2>
            <p className="form-intro">Your name and contact details for this Trimmer account.</p>
            <div className="form-grid">
              <Field label="First name" name="firstName" required defaultValue={profile.firstName} />
              <Field label="Middle name (optional)" name="middleName" defaultValue={profile.middleName || ""} />
              <Field label="Last name" name="lastName" required defaultValue={profile.lastName} />
              <Field label="Email" name="email" type="email" required defaultValue={profile.email} />
              <Field label="Date of birth" name="dateOfBirth" type="date" max={getSixteenYearsAgoDate()} defaultValue={profile.dateOfBirth?.slice(0, 10) || ""} />
              <label className="field"><span>Gender (optional)</span>
                <select name="gender" defaultValue={profile.gender}>
                  <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option>
                  <option value="non-binary">Non-binary</option><option value="self-described">Self-described</option>
                </select>
              </label>
              <label className="field">
                <span>Username</span>
                <input value={profile.username} disabled readOnly aria-describedby="username-help" />
                <small id="username-help" className="profile-field-hint">Cannot be changed here</small>
              </label>
            </div>
            <SaveControls state={profileState} pending={profilePending} />
          </section>

          <section className="profile-panel" hidden={section !== "routine"}>
            <p className="eyebrow">Routine</p>
            <h2>Grooming profile</h2>
            <p className="form-intro">Tell Trimmer how you like to care for your skin, hair, and beard.</p>
            <div className="form-grid">
              <SelectField label="Skin type" name="skinType" defaultValue={profile.groomingProfile.skinType} options={["oily", "dry", "combination", "normal", "unsure"]} />
              <SelectField label="Hair type" name="hairType" defaultValue={profile.groomingProfile.hairType} options={["straight", "wavy", "curly", "coily", "unsure"]} />
              <Field label="Hair concerns" name="hairConcerns" defaultValue={profile.groomingProfile.hairConcerns} />
              <Field label="Beard style" name="beardStyle" defaultValue={profile.groomingProfile.beardStyle} />
              <Field label="Grooming preferences" name="groomingPreferences" defaultValue={profile.groomingProfile.groomingPreferences} />
              <Field label="Skin-care goals" name="skinCareGoals" defaultValue={profile.groomingProfile.skinCareGoals} />
              <Field label="Hair-care goals" name="hairCareGoals" defaultValue={profile.groomingProfile.hairCareGoals} />
              <Field label="Sensitivities or allergies" name="sensitivities" defaultValue={profile.groomingProfile.sensitivities} />
            </div>
            <SaveControls state={profileState} pending={profilePending} />
          </section>

          <section className="profile-panel" hidden={section !== "settings"}>
            <p className="eyebrow">Settings</p>
            <h2>Preferences and settings</h2>
            <p className="form-intro">Choose how often you groom, your budget, language, and reminders.</p>
            <div className="form-grid">
              <SelectField label="Routine preference" name="routineFrequency" defaultValue={profile.preferences.routineFrequency} options={["daily", "weekly"]} />
              <Field label="Product budget" name="budgetAmount" type="number" min="0" step="0.01" defaultValue={String(profile.preferences.budgetAmount)} />
              <SelectField label="Budget currency" name="budgetCurrency" defaultValue={profile.preferences.budgetCurrency} options={["USD", "PKR", "GBP", "EUR"]} />
              <SelectField label="Preferred language" name="language" defaultValue={profile.preferences.language} options={["en", "ur"]} labels={languageLabels} />
            </div>
            <div className="profile-pref-grid">
              <label className="profile-pref-tile">
                <input type="checkbox" name="notifyEmail" defaultChecked={profile.preferences.notifications.email} />
                <span>
                  <strong>Email notifications</strong>
                  <small>Receive account and routine updates by email</small>
                </span>
              </label>
              <label className="profile-pref-tile">
                <input type="checkbox" name="assessmentReminders" defaultChecked={profile.preferences.notifications.assessmentReminders} />
                <span>
                  <strong>Assessment reminders</strong>
                  <small>Get reminders to review your grooming progress</small>
                </span>
              </label>
            </div>
            <SaveControls state={profileState} pending={profilePending} />
          </section>
        </form>

        {section === "results" && (
          <section className="profile-panel profile-history">
            <p className="eyebrow">Your saved results</p>
            <h2>Assessment history</h2>
            <p className="form-intro">Review recommendations, compare saved results, or remove individual records.</p>
            {assessments.length === 0 ? (
              <p className="empty-state profile-empty">No assessments saved yet. Record a result below to start your history.</p>
            ) : (
              <>
                <div className="assessment-list">
                  {assessments.map((assessment) => (
                    <article className="assessment-card profile-history-card" key={assessment.id}>
                      <div className="assessment-heading">
                        <div>
                          <p className="eyebrow profile-chip">{assessment.type} · {new Date(assessment.assessedAt).toLocaleDateString()}</p>
                          <h3>{assessment.title}</h3>
                        </div>
                        <form action={preview ? previewDeleteAssessment : deleteAssessment}>
                          <input type="hidden" name="assessmentId" value={assessment.id} />
                          <button className="text-button danger-button" type="submit">Delete</button>
                        </form>
                      </div>
                      {assessment.score !== null && <p className="profile-score"><strong>Score:</strong> {assessment.score}/100</p>}
                      {assessment.summary && <p>{assessment.summary}</p>}
                      {assessment.results.length > 0 && <ul className="assessment-results">{assessment.results.map((item) => <li key={`${assessment.id}-${item.label}`}><strong>{item.label}:</strong> {item.value}</li>)}</ul>}
                      {assessment.recommendedRoutine && <p><strong>Recommended routine</strong><br />{assessment.recommendedRoutine}</p>}
                    </article>
                  ))}
                </div>
                {assessments.length > 1 && (
                  <div className="compare-panel profile-compare">
                    <h3>Compare assessments</h3>
                    <div className="form-grid">
                      <SelectAssessment label="First assessment" value={leftId} assessments={assessments} onChange={setLeftId} />
                      <SelectAssessment label="Second assessment" value={rightId} assessments={assessments} onChange={setRightId} />
                    </div>
                    {left && right && <div className="comparison profile-compare-result">
                      <p><strong>Score change:</strong> {left.score === null || right.score === null ? "Scores not available" : `${right.score - left.score > 0 ? "+" : ""}${right.score - left.score} points`}</p>
                      {resultLabels.map((label) => (
                        <p className="profile-compare-row" key={label}>
                          <strong>{label}:</strong> <span>{leftValues.get(label) || "—"}</span> <span aria-hidden="true">→</span> <span>{rightValues.get(label) || "—"}</span>
                        </p>
                      ))}
                    </div>}
                  </div>
                )}
              </>
            )}

            <details className="assessment-entry profile-entry">
              <summary>Save an assessment result</summary>
              <p className="form-intro">Save your own assessment notes here. You can record scores, findings, and routine recommendations.</p>
              <form action={assessmentAction} className="form-grid">
                <Field label="Title" name="title" required />
                <SelectField label="Type" name="type" defaultValue="general" options={["skin", "hair", "grooming", "general"]} />
                <Field label="Score (0–100, optional)" name="score" type="number" min="0" max="100" step="1" />
                <label className="field full"><span>Summary</span><textarea name="summary" rows={3} /></label>
                <div className="field full">
                  <span>Assessment details (optional)</span>
                  <input type="hidden" name="results" value={JSON.stringify(assessmentResults.filter((item) => item.label.trim() || item.value.trim()))} />
                  <div className="assessment-result-fields">
                    {assessmentResults.map((item, index) => (
                      <div className="assessment-result-row" key={index}>
                        <label className="field"><span>Detail</span><input value={item.label} maxLength={80} onChange={(event) => setAssessmentResults((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value } : row))} /></label>
                        <label className="field"><span>Finding</span><input value={item.value} maxLength={500} onChange={(event) => setAssessmentResults((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, value: event.target.value } : row))} /></label>
                        {assessmentResults.length > 1 && <button className="text-button danger-button remove-result" type="button" onClick={() => setAssessmentResults((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>}
                      </div>
                    ))}
                  </div>
                  {assessmentResults.length < 30 && <button className="text-button add-result" type="button" onClick={() => setAssessmentResults((current) => [...current, { label: "", value: "" }])}>Add detail</button>}
                </div>
                <label className="field full"><span>Recommended routine</span><textarea name="recommendedRoutine" rows={4} /></label>
                <label className="field"><span>Assessment date</span><input type="datetime-local" name="assessedAt" /></label>
                <div className="full profile-entry-actions"><ActionFeedback state={assessmentState} /><button className="submit-button" type="submit" disabled={assessmentPending}>{assessmentPending ? "Saving…" : "Save assessment"}</button></div>
              </form>
            </details>
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue, type = "text", required = false, min, max, step }: {
  label: string; name: string; defaultValue?: string; type?: string; required?: boolean; min?: string; max?: string; step?: string;
}) {
  const isName = name === "firstName" || name === "middleName" || name === "lastName";
  return <label className="field"><span>{label}</span><input
    name={name}
    type={type}
    defaultValue={defaultValue}
    required={required}
    min={min}
    max={max}
    step={step}
    pattern={isName ? String.raw`[\p{L}]+(?: [\p{L}]+)*` : undefined}
    title={isName ? "Use letters and spaces only." : undefined}
    onChange={isName ? (event) => { event.currentTarget.value = sanitizeNameInput(event.currentTarget.value); } : undefined}
  /></label>;
}

function SelectField({ label, name, defaultValue, options, labels }: {
  label: string; name: string; defaultValue: string; options: string[]; labels?: Record<string, string>;
}) {
  return <label className="field"><span>{label}</span><select name={name} defaultValue={defaultValue}>{options.map((option) => <option key={option} value={option}>{labels?.[option] ?? formatOptionLabel(option)}</option>)}</select></label>;
}

function formatOptionLabel(option: string) {
  return option.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function SelectAssessment({ label, value, assessments, onChange }: {
  label: string; value: string; assessments: Assessment[]; onChange: (value: string) => void;
}) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{assessments.map((item) => <option key={item.id} value={item.id}>{item.title} · {new Date(item.assessedAt).toLocaleDateString()}</option>)}</select></label>;
}

function SaveControls({ state, pending }: { state: ActionState; pending: boolean }) {
  return (
    <>
      <ActionFeedback state={state} />
      <button className="submit-button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </>
  );
}

function ActionFeedback({ state }: { state: ActionState }) {
  if (state?.error) return <p className="form-error" role="alert">{state.error}</p>;
  if (state?.message) return <p className="form-message" role="status">{state.message}</p>;
  return null;
}
