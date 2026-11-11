import { FaceScanVisual } from "@/components/auth/face-scan-visual";
import { WaveEdge } from "@/components/auth/wave-edge";

export function BrandPanel() {
  return (
    <aside
      className="relative isolate grid min-h-[52vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden px-6 py-5 sm:px-10 lg:h-dvh lg:w-[47%] lg:min-w-[45%] lg:px-10 lg:py-7"
      style={{
        background:
          "linear-gradient(160deg, #3A1530 0%, #5A2450 42%, #7A3558 72%, #C45C6A 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -top-10 left-8 h-48 w-48 rounded-full blur-3xl"
        aria-hidden="true"
        style={{ backgroundColor: "rgba(255, 180, 150, 0.35)" }}
      />
      <div
        className="pointer-events-none absolute right-10 bottom-16 h-40 w-40 rounded-full blur-3xl"
        aria-hidden="true"
        style={{ backgroundColor: "rgba(240, 213, 168, 0.28)" }}
      />

      <div className="relative z-10 shrink-0">
        <p
          className="font-serif text-4xl tracking-tight sm:text-5xl"
          style={{ color: "#FFF6EF" }}
        >
          Trimmer
        </p>
        <p
          className="mt-1 text-xs tracking-[0.28em] uppercase"
          style={{ color: "#F0D5A8" }}
        >
          Personal grooming & self-care
        </p>
      </div>

      <div className="relative z-10 flex min-h-0 items-center justify-center pt-3">
        <FaceScanVisual />
      </div>

      <WaveEdge />
    </aside>
  );
}
