# fitlo — Documentation

This folder is the project's living knowledge base. Start here.

| Doc | Purpose |
| --- | --- |
| [contextProject.md](./contextProject.md) | **Start here for agents** — single-file map of the whole project (structure, data model, API, patterns, env gotchas, "where to edit X") so you don't have to read all the code |
| [architecture.md](./architecture.md) | System overview, server feature map, UI layers, data flow |
| [data-model.md](./data-model.md) | Entities, relationships, and the student-linking rule walkthrough |
| [code-structure.md](./code-structure.md) | Folder conventions & coding standards for the app |
| [setup.md](./setup.md) | Running locally and via Docker, env vars, common tasks |
| [i18n-and-rtl.md](./i18n-and-rtl.md) | How bilingual fa/en + RTL/LTR and theming work |
| _(brand)_ | No doc — the logo lives in `app/public/brand/{logo-full,logo-mark,logo-wordmark}.png`, rendered by `app/src/components/shared/logo.tsx`; the light/dark primary colors are the `--primary` HSL tokens in `app/src/app/globals.css` (light `217 91% 53%` / dark `217 91% 60%`), surfaced as Tailwind's `primary` in `app/tailwind.config.ts` |
| [api.md](./api.md) | API surface overview (full reference in contextProject.md §8) |
| [progress.md](./progress.md) | **Living checklist** of the 9 build phases + the NestJS→Next.js migration |
| [decisions/](./decisions) | Architecture Decision Records (ADRs) |
| [business-plan.md](./business-plan.md) | **فارسی** — market, personas, tier pricing proposal, unit economics, GTM, KPIs, risks. §8 «فاز ۰» lists the two code gaps that block charging money |

## How to read this

1. New to the project → [architecture.md](./architecture.md) then [data-model.md](./data-model.md).
2. Setting up → [setup.md](./setup.md).
3. Want to know _why_ a choice was made → [decisions/](./decisions).
4. Want to know _what's done_ → [progress.md](./progress.md).
