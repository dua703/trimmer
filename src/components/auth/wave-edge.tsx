export function WaveEdge() {
  return (
    <>
      <svg
        className="pointer-events-none absolute top-0 right-0 z-[1] hidden h-full w-16 lg:block xl:w-20"
        viewBox="0 0 80 800"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M80 0
             C58 70, 18 120, 28 200
             C40 290, 4 350, 26 430
             C48 510, 8 570, 30 650
             C48 710, 24 750, 48 780
             C60 794, 70 798, 80 800
             L80 0 Z"
          fill="#FFF6EF"
        />
      </svg>

      <svg
        className="pointer-events-none absolute right-0 bottom-0 z-[1] h-12 w-full lg:hidden"
        viewBox="0 0 800 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 60
             C90 18, 170 42, 260 22
             C370 0, 450 48, 560 24
             C660 4, 730 34, 800 10
             L800 60 Z"
          fill="#FFF6EF"
        />
      </svg>
    </>
  );
}
