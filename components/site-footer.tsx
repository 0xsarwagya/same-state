export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 flex w-full max-w-[1100px] items-baseline justify-between border-t border-ink/10 px-5 pb-14 pt-8 sm:px-6 md:px-10 md:pb-20 md:pt-10">
      <span className="label">a workshop demo · sarwagya.wtf</span>
      <a
        href="https://sarwagya.wtf"
        className="label transition-colors hover:text-rust"
      >
        Sarwagya Singh
      </a>
    </footer>
  );
}
