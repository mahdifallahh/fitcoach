# i18n, RTL/LTR & Theming

## Locales
- **fa** (Persian) — RTL, **default**.
- **en** (English) — LTR.

Adding a third locale = add `messages/<code>.json` + register the code in `i18n/routing.ts`. No structural
changes required (no hardcoded strings, direction derived from a locale→dir map).

## Routing (next-intl)
- All pages live under `app/[locale]/...`. The `next-intl` middleware handles locale detection/redirects.
- `i18n/routing.ts` declares `locales`, `defaultLocale`, and localized pathnames if needed.
- `i18n/request.ts` loads the right message bundle per request.

## Strings
- **Zero hardcoded UI text.** Components use `useTranslations('namespace')` (client) or
  `getTranslations()` (server). Keys live in `messages/fa.json` and `messages/en.json` with matching shape.
- Validation messages (Zod) are also keyed and translated.

## Direction & fonts
- Root layout sets `<html dir={dir} lang={locale}>` where `dir = locale === 'fa' ? 'rtl' : 'ltr'`.
- Fonts via `next/font`: **Vazirmatn** for fa, **Inter** for en; the active font is bound to a CSS variable
  selected by locale, so text shaping switches automatically.

## Mirroring (not just text flipping)
- Use **logical** Tailwind utilities everywhere: `ms-*/me-*`, `ps-*/pe-*`, `start-*/end-*`, `text-start/end`.
  Never `ml-/mr-/left-/right-` for directional layout.
- Directional icons (chevrons, arrows, back buttons) flip via an `rtl:-scale-x-100` utility or a
  direction-aware icon helper.
- Drag-and-drop, tabs, and the program builder are tested in both directions.

## Theming
- `next-themes` provides light/dark with **system** default and persisted user choice.
- Brand palette (**blue & white**) is expressed as CSS variables in `globals.css`; shadcn/ui reads them, so
  every component themes consistently. Dark mode swaps the variable set under `.dark`.
- A `ThemeToggle` (in `components/shared`) cycles light/dark/system; a `LocaleSwitcher` swaps locale while
  preserving the current path.
