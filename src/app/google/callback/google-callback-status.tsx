export function GoogleCallbackStatus({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <main
      className="flex min-h-dvh items-center justify-center px-6 py-16"
      style={{ backgroundColor: "#FFF6EF" }}
    >
      <section className="w-full max-w-[440px] rounded-[2rem] border border-line bg-white/80 p-8 shadow-[0_20px_60px_rgba(59,36,54,0.06)]">
        <p
          className="text-sm tracking-[0.26em] uppercase"
          style={{ color: "#C45C6A" }}
        >
          Google sign-in
        </p>
        <h1
          className="mt-4 font-serif text-4xl leading-tight"
          style={{ color: "#4A2040" }}
        >
          {title}
        </h1>
        <p className="mt-3 text-[15px] leading-7" style={{ color: "#7A534C" }}>
          {message}
        </p>
        {actionHref && actionLabel ? (
          <a
            href={actionHref}
            className="mt-8 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold"
            style={{ backgroundColor: "#4A2040", color: "#FFF6EF" }}
          >
            {actionLabel}
          </a>
        ) : null}
      </section>
    </main>
  );
}
