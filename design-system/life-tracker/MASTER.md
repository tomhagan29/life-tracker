# Life Tracker — Design System

> **LOGIC:** When building a specific page, first check `design-system/life-tracker/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> Otherwise, strictly follow the rules below.

**Project:** Life Tracker — finance + habit tracking dashboard
**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript, Tauri (desktop)
**Surface:** Web + Tauri desktop window. Single-user, local SQLite via Prisma.

---

## 1. Color palette

A 5-hue brand system + zinc neutrals. Each hue carries semantic meaning — pick by meaning, not for variety.

| Role | Tailwind | Hex | When to use |
|------|----------|-----|-------------|
| **Emerald** | `emerald-500` / `600` | `#10B981` / `#059669` | Positive money, current accounts, income, completed states, goal progress, completed habit days |
| **Sky** | `sky-500` | `#0EA5E9` | Informational, savings accounts |
| **Violet** | `violet-500` / `600` | `#8B5CF6` / `#7C3AED` | Habits, investment accounts, habit streaks |
| **Amber** | `amber-500` | `#F59E0B` | Warnings, "watch this" stats (budget left, funding alerts) |
| **Rose** | `rose-500` / `600` | `#F43F5E` / `#E11D48` | Credit / debt categorisation, negative balances |
| **Zinc-900** | `zinc-900` | `#18181B` | Neutral negative (outgoing money bars, primary text) |
| **Tailwind red** | `red-600` / `red-200` / `red-50` | — | Reserved for **destructive actions** (Delete buttons) and **error banners** only — different semantic from "debt category" rose |

### Accent color → CTA color separation
- **Brand accent:** the 5 hues above are for *visual categorisation* and *status*.
- **Primary CTA:** `bg-blue-600 hover:bg-blue-500 text-white` — used for the single primary action in any view (e.g. + Log, Save, Add).

### Background & text
| Token | Hex | Usage |
|---|---|---|
| `--background` | `#F6F7F4` | App background (warm off-white) |
| `--foreground` | `#171717` | Primary text |
| `bg-white` | `#FFFFFF` | Card surfaces |
| `border-zinc-200` | `#E4E4E7` | Card borders |
| `text-zinc-500` | `#71717A` | Secondary text (captions, labels) |
| `text-zinc-600` | `#52525B` | Minimum colour for body-size text on light bg (passes AA) |
| `text-zinc-950` | `#09090B` | Strong text (card titles) |
| `--focus-ring` | `#2563EB` | Focus outlines |

**Don't use** `text-zinc-400` for body text on `--background` — fails AA contrast. Reserve for icons or disabled states.

---

## 2. Typography

**Font:** Inter (variable, loaded via `next/font/google` in `app/layout.tsx`, plumbed through `--font-inter` → `--font-sans`).

```css
--font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system,
  "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Type scale

| Role | Tailwind | Use |
|---|---|---|
| Page H1 | `text-3xl sm:text-4xl font-semibold` | One per page, top of `PageHeader` |
| Card H3 | `text-xl font-semibold` | Card titles |
| Stat value | `text-2xl font-semibold tabular-nums` | StatCard headline number |
| Body | `text-sm` | Default for cards/tables |
| Caption | `text-xs font-medium` | Axis labels, helper text |
| Label | `text-sm font-semibold` | Form labels, list-item names |

### Numerals
- **Always add `tabular-nums`** to currency, percentages, and any vertically-stacked numeric column. Already applied across stat cards, accounts/budget/goals tables, and chart axes.

### Date format
- Render dates client-side via `toLocaleDateString(undefined, …)` so the user's locale wins. The `PageHeader` already does this via `useSyncExternalStore` to avoid hydration mismatch.

---

## 3. Spacing & layout

Use Tailwind defaults. Conventions in this codebase:

| Context | Spacing |
|---|---|
| Card outer padding | `p-5` |
| Card section gap (vertical) | `mt-5` |
| Section gap between cards | `mt-6` and `gap-4` (stat cards) / `gap-6` (full-width sections) |
| Inline gap | `gap-2` (buttons) / `gap-3` (icon + text) / `gap-4` (header items) |
| Card border radius | `rounded-lg` |
| Button border radius | `rounded-md` |

### App shell
The `app-shell` component class in `globals.css` defines a responsive 1-col → 2-col grid (sidebar + content) at `lg:` and above, with max-widths at three breakpoints (`1024px`, `1600px`, `2200px`). Don't override; use `app-content` for page padding.

### Shadows
| Token | Use |
|---|---|
| `shadow-sm` | Default for cards (very subtle) |
| `shadow-xl` | Modals only |

Avoid `shadow-md` and `shadow-lg` unless you have a specific elevation reason — the app's flat aesthetic is intentional.

---

## 4. Component specs

### 4.1 Card
```
rounded-lg border border-zinc-200 bg-white p-5 shadow-sm
```
- Title: `text-xl font-semibold`
- Optional subtitle: `mt-1 text-sm text-zinc-500`
- Content gap from title: `mt-5`

### 4.2 StatCard (`stat-card.tsx`)
- Label `text-sm font-medium text-zinc-500`
- Value `text-2xl font-semibold tabular-nums text-zinc-950` (mt-2)
- Detail `text-sm text-zinc-600` (mt-4)
- Top-right colored dot: `h-3 w-3 rounded-full <accent>` with `aria-hidden="true"`

### 4.3 Buttons

**Primary CTA**
```
rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white
hover:bg-blue-500 disabled:bg-zinc-300
```

**Neutral / secondary**
```
rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-semibold
hover:bg-zinc-50
```

**Destructive (Delete / Reset)**
```
rounded-md border border-red-200 px-2.5 py-1.5 text-sm font-semibold
text-red-600 hover:bg-red-50
```

**Constructive (Complete)**
```
rounded-md border border-emerald-200 px-2.5 py-1.5 text-sm font-semibold
text-emerald-700 hover:bg-emerald-50
```

**Icon button** (e.g. modal × close)
```
rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900
```
- Always include `aria-label`.
- SVG: `size-5`, `strokeWidth={2}`, `aria-hidden="true"`.

#### Touch targets
The global rule in `globals.css` gives **all** `<button>`s inside `<table>` or `<dialog>` `min-height: 2.75rem` on mobile and `2.25rem` on `sm+`. Don't fight this — let it work.

### 4.4 Inputs / selects / textareas
```
rounded-md border border-zinc-300 px-2 py-1
disabled:bg-zinc-100
```
- Right-align numeric inputs and add `tabular-nums`.
- Add `aria-label` for inputs without an associated `<label>` (especially in table footer "add" rows).
- Focus is handled globally — don't add a per-element focus class.

### 4.5 DataTable (`data-table.tsx`)
The shared `<DataTable>` component. Use it for any tabular list. Columns specify `key`, `header`, `cell`, optional `className`. Add `tabular-nums` to numeric column classNames.

### 4.6 Modal — native `<dialog>`
Pattern in `log-modal.tsx`. **Always** use the native `<dialog>` element — never a custom div overlay. It gives free `role="dialog"`, focus trap, ESC handling, and outside-content inert behaviour.

```tsx
<dialog
  ref={dialogRef}
  aria-labelledby="modal-title-id"
  onClose={() => onClose()}
  onClick={(e) => { if (e.target === e.currentTarget) dialogRef.current?.close(); }}
  className="mx-auto mt-6 w-[calc(100%-2rem)] max-w-4xl overflow-hidden
             rounded-lg bg-white p-0 shadow-xl
             backdrop:bg-zinc-950/45 sm:my-auto"
>
  …
</dialog>
```

**Required:**
- Open/close via `useEffect` calling `dialog.showModal()` / `dialog.close()` based on a parent `open` prop.
- Body scroll lock via `useEffect`: `document.body.style.overflow = 'hidden'` when open.
- × icon close button (`aria-label`) — never a bordered "Close" pill.
- `id` on the title heading + `aria-labelledby` on the dialog.

### 4.7 Progress bar (`progress-bar.tsx`)
```
mt-3 h-2 rounded-full bg-zinc-100  ← container
h-full rounded-full <color>        ← fill
```
Default fill `bg-emerald-500`. Override with `bg-emerald-600` for goal progress, `bg-violet-500` for habit streaks.

### 4.8 Charts (bar)
- Y-axis on the left (peak label at top, `£0` at bottom), `tabular-nums text-zinc-500 text-xs`.
- X-axis labels under bars, `text-xs font-medium text-zinc-600 truncate`.
- For dense series (e.g. month = 31 days), show every Nth label only — never overlap.
- Income bars: `bg-emerald-500`. Outgoing/spending bars: `bg-zinc-900`.
- Decorative legend dots: `<span aria-hidden="true" class="h-2.5 w-2.5 rounded-full …">` — never `<i>`.

### 4.9 Sidebar
Lives at `lg:` and up. Mobile shows it collapsed at the top. Brand wordmark at top, then navigation list, then optional info sections (setup checklist, upcoming bills, alerts, daily quote). Each info section: `rounded-lg border p-4` with a tinted background.

---

## 5. Accessibility rules (non-negotiable)

1. **Focus-visible.** A 2px solid `#2563EB` outline (with 2px offset) is applied globally to every `:focus-visible`. Inputs/selects/textareas use a tighter inset variant. Don't suppress.
2. **Keyboard nav.** Tab order matches visual order. Never trap focus outside a modal.
3. **Modal a11y.** Use native `<dialog>` (see 4.6). Anything custom must replicate role/aria-modal/focus-trap/ESC/inert.
4. **Touch targets.** Min 44×44 px on mobile (handled globally for table/dialog buttons).
5. **Contrast.** Body-size text ≥ 4.5:1. Don't use `text-zinc-400` on `--background`.
6. **Labels.** Every input has either a `<label htmlFor>` or `aria-label`.
7. **Images & icons.** Decorative SVGs / dots get `aria-hidden="true"`. Meaningful icons get an `aria-label`.
8. **Reduced motion.** Keep transitions short (≤ 200 ms) and use only `background-color`, `border-color`, `color`. Never `transform` on hover (it triggers layout shifts and ignores `prefers-reduced-motion`).

---

## 6. Anti-patterns (do NOT use)

| Anti-pattern | Use instead |
|---|---|
| `transform: translateY(-1px)` on hover (especially globally) | `background-color` / `color` transitions |
| Emojis as icons (`✓`, `🚀`, `⚙️`) | Inline SVG (Heroicons-style stroke icons, `viewBox="0 0 24 24"`, `strokeWidth={2}`) |
| `<i>` as a decorative dot | `<span aria-hidden="true">` |
| `text-green-600` / `text-red-600` for positive/negative numbers | `text-emerald-600` / `text-rose-600` (matches brand palette) |
| Custom div-overlay modal | Native `<dialog>` + `showModal()` |
| Bordered "Close" pill button on a modal | × icon button with `aria-label` |
| Misleading colour on neutral data | Only colour numbers when sign / status genuinely matters |
| Hover effect on a non-interactive card | No hover effect at all |
| Coloured dots / underlines without `aria-hidden` | Always mark decoration `aria-hidden="true"` |
| `lg:grid-cols-3` for an action button cluster (full-bleed buttons) | Flex row with auto-sized buttons |
| Server-rendered "today" date stuck in en-US | Client-rendered with `toLocaleDateString(undefined, …)` |
| `text-zinc-400` for body-size text on `--background` | `text-zinc-600` (or higher) |

---

## 7. Page-level conventions

Every top-level page renders:
```tsx
<main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
  <div className="app-shell">
    <Sidebar />
    <div className="app-content">
      <PageHeader title="…" />
      {/* page content with mt-6 sections */}
    </div>
  </div>
</main>
```
- Don't deviate from `app-shell` / `app-content`.
- Page H1 lives in `PageHeader`. Don't add another H1.

---

## 8. Pre-delivery checklist

Before merging UI changes, verify:

- [ ] Uses brand palette only (no fuchsia, teal, cyan, lime, etc.)
- [ ] Currency / numerals carry `tabular-nums`
- [ ] All `<button>` and `<a>` have visible `:focus-visible` ring
- [ ] All inputs/selects have a label or `aria-label`
- [ ] Decorative SVGs / dots have `aria-hidden="true"`
- [ ] Icon-only buttons have `aria-label`
- [ ] Modals are native `<dialog>` with body scroll lock + backdrop dismiss
- [ ] No emoji glyphs as icons
- [ ] No transform on hover
- [ ] Lint, types, tests, and `next build` all pass
- [ ] Tested at 375 / 768 / 1024 / 1440 widths
