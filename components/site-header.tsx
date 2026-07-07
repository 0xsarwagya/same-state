import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1100px] items-baseline justify-between px-5 pt-8 sm:px-6 md:px-10 md:pt-10">
      <Link
        href="/"
        className="font-serif italic text-ink transition-colors hover:text-rust"
        style={{ fontSize: "clamp(24px, 2.4vw, 32px)" }}
      >
        Same State
      </Link>
      <nav className="flex items-baseline gap-6 label">
        <a
          href="https://github.com/0xsarwagya/same-state"
          className="transition-colors hover:text-rust"
          target="_blank"
          rel="noreferrer"
        >
          source
        </a>
        <a
          href="https://oss.sarwagya.wtf/clinical-receipt"
          className="transition-colors hover:text-rust"
          target="_blank"
          rel="noreferrer"
        >
          package
        </a>
      </nav>
    </header>
  );
}
