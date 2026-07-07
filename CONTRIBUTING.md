# Contributing to Same State

Same State is a small demo. Contributions that keep it small and sharp
are welcome; contributions that turn it into a clinical product are not.

## Scope

This repo demonstrates `@0xsarwagya/clinical-receipt`. It exists to be
copied and forked, not to grow. Good contributions include:

- Making the diff panel easier to read.
- Adding streaming to the model call so the UI shows progress token-
  by-token.
- Better handling for HAPI outages or empty Observation searches.
- Docs, screenshots, small accessibility fixes.

Contributions that expand the surface area (auth, real signing, DB,
multi-tenant, hosted model keys) are probably better as their own
project.

## Dev setup

```
pnpm install
pnpm dev
```

Requires Node ≥ 20 (Web Crypto with Ed25519, `AbortSignal.timeout`).

The Same-State orchestrator lives in `lib/same-state.ts`. Everything
else is either a shell around it (page + components) or a proxy layer
(`app/api/*`).

## Pull request conventions

- Small PRs. One idea per PR.
- Include a screenshot when you change the UI.
- Match the existing prose voice: short sentences, no marketing copy,
  honest about limits.
- Run `pnpm check-types` and `pnpm lint` before submitting.

## Commit messages

Conventional commits are welcome but not required. The one rule this
repo inherits from the family: **no AI attribution in commits.** No
`Co-Authored-By: <AI service>` lines, no `🤖`, no "Generated with".
If you paired with an AI, thank it silently.

## Reporting bugs

Open an issue with:

- What you clicked.
- What you expected.
- What happened (screenshot / console log / receipt JSON).
- Whether HAPI or OpenRouter was reachable at the time.

## Code of conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

By contributing you agree that your changes will be released under the
[MIT license](./LICENSE) that governs the rest of the repo.
