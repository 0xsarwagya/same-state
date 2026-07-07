import { SameStateApp } from "@/components/same-state-app";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-12 px-5 pb-16 pt-10 sm:px-6 md:px-10 md:pt-16">
        <section className="rise flex flex-col gap-4">
          <span className="label">a demo of @0xsarwagya/clinical-receipt</span>
          <h1
            className="font-serif italic text-ink"
            style={{ fontSize: "clamp(44px, 6vw, 84px)", lineHeight: 1.05 }}
          >
            Same clinical state.
            <br />
            Different model.
            <br />
            Verifiable difference.
          </h1>
          <p
            className="max-w-2xl text-ink/80"
            style={{ fontSize: "clamp(17px, 1.35vw, 21px)", lineHeight: 1.5 }}
          >
            Two runs against the exact same committed FHIR clinical state,
            through two different models via OpenRouter. Two receipts. One
            diff that shows what actually changed. Bring your own OpenRouter
            key; nothing here uses real patient data.
          </p>
        </section>

        <section className="rise rise-1 flex flex-col gap-2 rounded border border-ink/10 bg-ink/5 p-4 text-sm text-ink/80">
          <span className="label">before you start</span>
          <ul className="list-disc pl-5">
            <li>
              This demo runs against the{" "}
              <a
                href="https://hapi.fhir.org/baseR4"
                className="underline decoration-ink/30 underline-offset-2 hover:text-rust hover:decoration-rust"
                target="_blank"
                rel="noreferrer"
              >
                public HAPI FHIR test server
              </a>
              . Never use it for real PHI.
            </li>
            <li>
              Bring your own{" "}
              <a
                href="https://openrouter.ai/settings/keys"
                className="underline decoration-ink/30 underline-offset-2 hover:text-rust hover:decoration-rust"
                target="_blank"
                rel="noreferrer"
              >
                OpenRouter key
              </a>{" "}
              — kept only in this tab&apos;s memory.
            </li>
            <li>
              Each receipt is signed by an ephemeral browser-held Ed25519 key
              and is self-attested. Not a hospital signer, not a clinical
              claim.
            </li>
          </ul>
        </section>

        <div className="rise rise-2">
          <SameStateApp />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
