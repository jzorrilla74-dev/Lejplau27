# Handoff: LeJplauu — Warm Dark UI

## Overview
A re-skin of the LeJplauu architectural design tool (React + Vite + Konva). The app is a 3-pane workspace — Brief (left), Konva canvas (centre), Metrics + Critic (right). This handoff replaces the current dark indigo theme with a warm earth-tone dark palette, replaces emoji iconography with Lucide React icons, tightens the type scale, and introduces a draggable / collapsible panel primitive for the right column.

## About the Design Files
`UI Redesign.html` in this folder is a **design reference** — an HTML prototype that shows the intended look and behaviour. **Do not ship its markup or CSS directly.** Recreate the look in the existing React codebase using the existing component structure (`BriefPanel`, `CanvasPanel`, `Inspector`, `Metrics`, `Palette`, `CriticPanel`, `LayerPanel`). Only the styling, iconography, and the new `<Panel>` primitive change. App logic, state, and the Konva layer stay as-is.

## Fidelity
**High-fidelity.** Colors, spacing, typography, and stateful affordances (collapsed, mid-drag, active/pressed) are final. Reproduce them pixel-close.

## Target codebase
Repo: `jzorrilla74-dev/Lejplau27` · branch: `claude/setup-vite-konva-project-LkYkM`
Stack: React 19, Vite 8, react-konva 19, Tailwind 4 (present but unused), uuid.

## What changes

| Surface | Before | After |
|---|---|---|
| Theme tokens | `:root` in `src/index.css`, indigo accent | Warm dark palette (see Tokens) |
| Iconography | Emoji (💾📂🖼☀🌙⊞👁🔒🗑) | Lucide React SVG icons |
| Right column | Stacked `Metrics` + tabs (Rooms / Critic) | Stacked draggable/collapsible `<Panel>` cards: Footprint, Issues, Inspector |
| Type scale | Body 13px, UI 9–11px | Body 13px, UI floor 11px, headings 12px/600, KPIs 36–42px serif |
| Numerals | Default | `font-variant-numeric: tabular-nums` everywhere; Instrument Serif italic for KPI numbers |
| Programme priority | Native `<select>` | Chips: Essential / Desired / Optional |
| Inspector "Remove room" | Solid red full-width | Ghost button at the bottom, red on hover only |

## Design tokens

Replace the `:root` block in `src/index.css` with the values in `tokens.css` (also in this folder).

```css
:root {
  --bg:    #1a1612;   /* page */
  --bg-1:  #221d18;   /* panels */
  --bg-2:  #2c2620;   /* hover / cards */

  --tx:    #f1ead9;   /* primary text */
  --tx-2:  #b6ab93;   /* secondary text */
  --tx-3:  #7c7160;   /* muted / labels */

  --bd:    #332c24;   /* hairlines */
  --bd-2:  #46392e;   /* heavier dividers */

  --accent:   #e0825a;   /* terracotta — primary action / focus */
  --accent-2: #9bbf8a;   /* sage — KPIs, AI, success */

  --green:  #9bbf8a;
  --amber:  #e0a85a;
  --red:    #e58a7a;
}

/* room category fills (Konva strokes/fills — used in roomDefaults.js CAT_STYLES) */
:root {
  --cat-living-fill:    #3a2f1a;  --cat-living-stroke:    #5a4a28;
  --cat-cooking-fill:   #3f2c18;  --cat-cooking-stroke:   #6a4a26;
  --cat-sleeping-fill:  #243121;  --cat-sleeping-stroke:  #3e5236;
  --cat-wet-fill:       #1f2a30;  --cat-wet-stroke:       #34464f;
  --cat-outdoor-fill:   #27321f;  --cat-outdoor-stroke:   #3e4f30; /* dashed stroke */
}

body { font-family: Inter, system-ui, sans-serif; font-size: 13px; line-height: 1.5; }
.serif { font-family: "Instrument Serif", Georgia, serif; font-style: italic; font-weight: 400; }
.mono  { font-family: "JetBrains Mono", ui-monospace, monospace; font-feature-settings: "tnum","zero"; }
```

Add Google Fonts `Inter`, `Instrument Serif`, `JetBrains Mono` (400/500/600/700 for Inter; 400 italic for Instrument Serif; 400/500 for JetBrains Mono) via `<link>` in `index.html`.

### Spacing & radii
- Base unit: 4px. Common: 4, 6, 8, 10, 14, 18, 22.
- Panel padding: `14px 22px` (right rail), `14px 20px` (left rail).
- Border radius: 4 (controls), 8 (fields), 10–14 (cards).
- Hairline: `1px solid var(--bd)`. Panel divider: `1px solid var(--bd-2)`.

### Type scale
| Use | Size / weight / family |
|---|---|
| Body | 13 / 400 / Inter |
| UI label small caps | 11 / 600 / Inter, `letter-spacing: .16em; text-transform: uppercase; color: var(--tx-2)` |
| Section title | 12 / 600 / Inter |
| Project name | 24 / 400 / Instrument Serif italic |
| KPI number | 42 / 400 / Instrument Serif italic |
| Numbers in tables | 13 / 400 / Instrument Serif italic *or* JetBrains Mono with `tabular-nums` |
| Inputs | 13 / 400 / Inter, 34px tall, 8px radius |

## Iconography

**Install:** `npm i lucide-react`

Replace every emoji. Map:

| Emoji in repo | Lucide icon | Where |
|---|---|---|
| 💾 | `Save` | CanvasToolbar |
| 📂 | `Upload` | CanvasToolbar (Load) |
| 🖼 | `ImageDown` | CanvasToolbar (Export) |
| ☀ / 🌙 | `Sun` / `Moon` | Theme toggle |
| ⊞ | `Grid3x3` | Grid toggle |
| ↩ ↪ | `Undo2` `Redo2` | Undo/redo |
| 👁 | `Eye` `EyeOff` | LayerPanel visibility |
| 🔒 / 🔓 | `Lock` `Unlock` | LayerPanel + Inspector |
| 🗑 | `Trash2` | LayerPanel + Inspector |
| ⚙ | `Settings` | Critic API key |
| 👍 / 👎 | `ThumbsUp` `ThumbsDown` | Critic feedback |
| → (send) | `ArrowUp` or `SendHorizonal` | Critic composer |
| Tool "S" | `MousePointer2` | Select tool |
| Tool "H" | `Hand` | Pan tool |

Default: `size={14} strokeWidth={1.6}`. Toolbar icons render at 14, status badges at 12, large emoji-replacements at 16.

## New primitive: `<Panel>`

A draggable, collapsible card. Replaces the right-column stacked sections.

### API
```jsx
<PanelStack onReorder={(ids) => …}>
  <Panel id="footprint" title="Footprint" meta="60%" defaultOpen>
    <FootprintCard />
  </Panel>
  <Panel id="issues" title="Issues" meta="2" defaultOpen>
    <IssuesList />
  </Panel>
  <Panel id="inspector" title="Inspector" meta="Master bed · 19.8 m²" defaultOpen={false}>
    <Inspector />
  </Panel>
</PanelStack>
```

### Visual spec
- Header row: 36px tall, `padding: 10px 14px 10px 8px`, `cursor: grab`. On `:active` → `grabbing`.
- Grip: 6 dots in 2×3 grid at left, `var(--tx-3)` at 45% opacity. Width 14px.
- Label: 11px / 600 / .16em tracking / uppercase / `var(--tx-2)`.
- Meta (right of label): 11px / `var(--tx-3)`. KPIs use `.serif` size 14.
- Chevron: Lucide `ChevronDown`, 14px, rotates `-90deg` when collapsed (200ms).
- Body: hidden when collapsed.
- Mid-drag: header background `var(--bg-1)` (or `var(--bg-2)` on dark), `box-shadow: 0 8px 24px rgba(0,0,0,.5)`, `z-index: 2`.
- Hover on header: background `var(--bg-1)`.
- Between cards: 1px hairline `var(--bd)`.

### Implementation
Use **`@dnd-kit/core` + `@dnd-kit/sortable`** (`npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`). Persist order to `localStorage` keyed `panelOrder:right`. Persist collapsed state per-panel keyed `panelOpen:<id>`.

Skeleton:
```jsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown } from 'lucide-react';

function Panel({ id, title, meta, children, defaultOpen = true }) {
  const [open, setOpen] = useLocalStorage(`panelOpen:${id}`, defaultOpen);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={`pn ${isDragging ? 'pn-dragging' : ''}`} data-collapsed={!open}>
      <button className="pn-head" {...attributes} {...listeners} onClick={() => setOpen(o => !o)}>
        <Grip />
        <span className="pn-lab">{title}</span>
        {meta && <span className="pn-meta">{meta}</span>}
        <ChevronDown size={14} className="pn-chev" />
      </button>
      {open && <div className="pn-body">{children}</div>}
    </div>
  );
}
```

Apply the same pattern to **left-rail brief sections** (`BriefPanel.jsx`'s `<Section>`) — they already collapse; just add the grip + dnd-kit wrapper and persist order.

## Right column composition

```
┌── Footprint card ─────────────────────┐
│  ⋮⋮  FOOTPRINT          60%       ⌄ │
│  «114» / 189 m²                    60%│   ← 42px serif italic numeral
│  ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  (gauge)         │
│  ● Living & cooking          36 m²    │
│  ● Sleeping                  42 m²    │
│  ● Wet rooms                  8 m²    │
│  ● Outdoor                   28 m²    │
└───────────────────────────────────────┘

┌── Issues card ────────────────────────┐
│  ⋮⋮  ISSUES              2        ⌄ │
│  ⊘ Missing essential                  │
│       Bed 2 has no adjacent bath      │
│  ▲ Setback                            │
│       South boundary at -0.4 m        │
└───────────────────────────────────────┘

[ Critic | Palette | Inspector ]            ← tabs (existing)
```

Move the existing `Metrics.jsx` content into the Footprint panel; convert each warning row into an Issues row with a Lucide icon (`AlertCircle`, `AlertTriangle`).

## Programme priority chips

In `BriefPanel.jsx`, replace the `<select>` with three chip buttons:

```jsx
<div className="chip-group">
  {['essential','desired','optional'].map(p => (
    <button key={p}
      className={`chip ${p === item.priority ? `chip--${p} on` : ''}`}
      onClick={() => dispatch({type:'UPDATE_PROGRAMME_ITEM', id, patch:{priority:p}})}>
      {p[0].toUpperCase() + p.slice(1)}
    </button>
  ))}
</div>
```

Chip styles:
- `.chip` — 20px tall, padding `0 9px`, radius `11px`, font 10/500/.04em uppercase.
- `.chip--essential.on` — `background: rgba(224,130,90,.16); color: var(--accent)`.
- `.chip--desired.on`   — `background: var(--bg-2); color: var(--tx-2)`.
- `.chip--optional.on`  — transparent, `1px solid var(--bd-2)`, `color: var(--tx-3)`.

## Inspector

- Move "Remove room" to a *ghost* button at the bottom: `1px solid var(--bd-2)`, transparent fill, `color: var(--tx-2)`. On hover: `color: var(--red); border-color: var(--red); background: rgba(229,138,122,.08)`.
- Rotation 0/90/180/270 → segmented control: pill background `var(--bg-2)`, active thumb `var(--bg-1)` with subtle shadow.
- Lock toggle → small icon button (Lucide `Lock` / `Unlock`), not a full-width button.

## Konva canvas

The canvas itself stays Konva (don't rewrite). Update `CAT_STYLES` in `src/lib/roomDefaults.js` to use the warm dark palette (CSS vars referenced above). Increase room label font from 9 to 11 in `RoomLayer.jsx`. Use `JetBrains Mono` for the dimension labels (e.g. `5.5 × 4.0 m · 22 m²`).

Background: keep dotted/grid background, but use `rgba(255,255,255,.04)` dot fill on `var(--bg)` so it reads on dark.

## Toolbar

Move from compact strip to a **floating dock** centred at the bottom of the canvas (see direction C in the prototype) — OR keep the top strip but: 28px tall buttons, 6px gap, `var(--bg-1)` hover, `var(--bg-2)` active-pressed, no borders by default. Add tooltip on hover.

Group order: `[Select Pan Wall Measure] | [Undo Redo] | [Zoom-out 22 px/m Zoom-in] | [Grid Snap Layers] | [Theme Save Load Export]`.

## Spacing inventory

Right-rail card padding: `14px 18px` body, `10px 14px 10px 8px` head.
Form fields: `34px` tall, `8px` radius, `12px` horizontal padding.
Section gap inside body: `10px` between label and field.
Vertical rhythm between cards: `0` (hairline only).

## State / behaviour

- Panel order persisted: `localStorage["panelOrder:right"] = ["footprint","issues","inspector"]`.
- Panel open/closed: `localStorage["panelOpen:<id>"] = boolean`.
- Drag uses pointer sensor with 8px activation distance so click-to-collapse still works.
- On reorder, fire `onReorder(newIds)` so the parent can persist; sortable items animate with default `@dnd-kit` transition (`200ms ease`).
- Collapse animation: chevron rotates 200ms; body uses display toggle (no height animation needed — keeps layout simple).

## Migration checklist (suggested order)

1. Add fonts to `index.html`. Replace `:root` in `src/index.css` with `tokens.css`.
2. Install `lucide-react`. Sweep emoji → icons in `CanvasToolbar`, `LayerPanel`, `Inspector`, `CriticPanel`.
3. Update `CAT_STYLES` in `roomDefaults.js` and label sizes in `RoomLayer.jsx`.
4. Build `<Panel>` + `<PanelStack>` primitive. Wrap right-column content in three panels.
5. Replace programme `<select>` with chip group.
6. Refactor Inspector remove button + segmented controls.
7. Polish: tooltips, focus rings (3px `rgba(224,130,90,.18)`), hover states.
8. QA pass — every interactive element should have a hover, focus, and pressed state in the new palette.

## Files in this folder

- `README.md` — this file.
- `tokens.css` — drop-in replacement for the `:root` block.
- `UI Redesign.html` — design reference. Open in a browser, focus the **B (dark)** artboard.
