"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  AnalysisScene,
  MappingScene,
  ScanningScene,
} from "@/components/auth/face-scenes";

const SCENES = [
  {
    id: "mapping",
    title: "Facial Mapping",
    caption:
      "Landmark points and mesh lines plot symmetry, contours, and facial geometry.",
  },
  {
    id: "scanning",
    title: "AI Face Scanning",
    caption:
      "A guided scan beam reads light, texture, and structure for intelligent facial analysis.",
  },
  {
    id: "analysis",
    title: "Skin Analysis",
    caption:
      "Illuminated zones highlight tone, hydration, and care-ready skin needs.",
  },
] as const;

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function FaceScanVisual() {
  const [index, setIndex] = useState(0);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useEffect(() => {
    if (reduced) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SCENES.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [reduced]);

  const scene = SCENES[index];

  return (
    <div className="flex h-full min-h-0 w-full max-w-lg flex-col items-center">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div className="relative aspect-[4/5] h-full max-h-[min(46vh,340px)] w-auto max-w-full sm:max-h-[min(50vh,380px)]">
          <div
            className="pointer-events-none absolute inset-[6%] rounded-full blur-3xl"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(255,180,150,0.5), transparent 64%)",
            }}
          />
          <div key={scene.id} className="relative h-full w-full animate-scene-enter">
            {scene.id === "mapping" ? <MappingScene /> : null}
            {scene.id === "scanning" ? <ScanningScene /> : null}
            {scene.id === "analysis" ? <AnalysisScene /> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 shrink-0 px-2 text-center" aria-live="polite">
        <p
          className="font-serif text-2xl leading-tight sm:text-[1.85rem]"
          style={{ color: "#FFF6EF" }}
        >
          {scene.title}
        </p>
        <p
          className="mx-auto mt-1.5 max-w-sm text-sm leading-6"
          style={{ color: "#FFD4C2" }}
        >
          {scene.caption}
        </p>
      </div>

      <div
        className="mt-3 mb-1 flex shrink-0 items-center gap-2"
        role="tablist"
        aria-label="Animation scenes"
      >
        {SCENES.map((item, sceneIndex) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={sceneIndex === index}
            aria-label={item.title}
            onClick={() => setIndex(sceneIndex)}
            className="h-2 rounded-full transition-all duration-500 focus-visible:ring-2 focus-visible:outline-none"
            style={{
              width: sceneIndex === index ? 40 : 10,
              backgroundColor:
                sceneIndex === index
                  ? "#F0D5A8"
                  : "rgba(255, 212, 194, 0.45)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
