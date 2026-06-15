# Handoff: Warm Refinement Redesign

## Overview

This handoff package contains a full visual redesign of the **SPS Airport Transportation app** (Suhradam Parivar Shibir) — every screen, every role. The redesign delivers what the existing `Frontend/SPS-DESIGN.md` document already describes but the live app doesn't yet honor: a **temple-warm Harisumiran aesthetic** (cream + terracotta + navy) replacing the generic corporate blue currently shipping. It also tightens the day-of mobile Sarthi experience and systematizes status colors across the app.

The package covers:
- **Login** — warm sign-in
- **Sarthi (Driver) Pickup Tool** — mobile day-of field tool
- **Transport Admin** — Bhaktos Dashboard, Arrival/Departure flight groups, Sarthi Roster, Vehicles
- **Super Admin** — Users, Notification Templates, Vehicles

## About the design files

The files in `designs/` are **design references**, not production code to copy directly. They are static HTML/CSS/vanilla-JS prototypes built to communicate the intended look, layout, and interactions.

**Your task is to recreate these designs in the existing `Frontend/Airport Transportation Management App` codebase** (React 18 + TypeScript + Vite + Tailwind v4 + shadcn/ui), using its established patterns:
- Update CSS variables in `src/styles/theme.css`
- Modify the existing `.tsx` screens in `src/app/components/`
- Replace inline hex literals (`style={{ color: "#0C71C3" }}`) with semantic Tailwind classes / CSS vars (`text-primary`, `bg-card`)
- Keep using shadcn/ui components and `lucide-react` icons

Do **not** ship the HTML files or migrate to vanilla JS.

## Fidelity

**High fidelity.** Exact hex values, type scale, spacing, radii, and interactions are specified below. Match them precisely. The prototypes also include a **dark mode** to use as a reference.

---

## Design tokens (paste-ready)

These replace the contents of the `:root` and `.dark` blocks in `src/styles/theme.css`. Tailwind's `@theme inline` mapping at the bottom of that file does not need to change.

### Light theme

```css
:root {
  /* surfaces — warm */
  --background:       #F7F0E6;  /* page background — warm cream */
  --foreground:       #494D52;  /* body text — charcoal */
  --card:             #FFFFFF;
  --card-foreground:  #494D52;
  --popover:          #FFFFFF;
  --popover-foreground:#494D52;
  --secondary:        #FBF4EB;  /* subtle secondary surface */
  --secondary-foreground: #494D52;
  --muted:            #F6ECDF;
  --muted-foreground: #9A8B7B;  /* warm muted text */

  /* brand — interactive blue stays as the action color */
  --primary:          #0C71C3;
  --primary-foreground:#FFFFFF;

  /* brand warmth — terracotta accent (NEW role) */
  --accent:           #C0552F;  /* terracotta — was #067BC2 */
  --accent-foreground:#FFFFFF;

  --destructive:      #D8392B;
  --destructive-foreground:#FFFFFF;

  --border:           #EADBC9;  /* warm line */
  --input:            transparent;
  --input-background: #FFFFFF;
  --switch-background:#EADBC9;
  --ring:             #0C71C3;

  /* typography unchanged: Rubik 500/600 */
  --font-weight-medium: 500;
  --font-weight-normal: 500;
  --font-size: 14px;
  --radius: 0.5rem;        /* slight bump from 0.25rem for the new card style */
}
```

### Dark theme

```css
.dark {
  --background:       #16110D;
  --foreground:       #D9CEC3;
  --card:             #221A14;
  --card-foreground:  #D9CEC3;
  --popover:          #221A14;
  --popover-foreground:#D9CEC3;
  --secondary:        #1D1610;
  --secondary-foreground:#F4EADF;
  --muted:            #2A2018;
  --muted-foreground: #9F8F7F;
  --primary:          #4FA3E8;
  --primary-foreground:#FFFFFF;
  --accent:           #D9714A;
  --accent-foreground:#FFFFFF;
  --destructive:      #E04A3F;
  --destructive-foreground:#FFFFFF;
  --border:           #392F27;
  --input:            #2A2018;
  --ring:             #4FA3E8;
}
```

### Semantic status tokens (add — referenced everywhere)

Add these alongside the existing tokens. Use `color-mix` for the tints; they auto-adapt to the surface.

```css
:root {
  --head:        #173D61;   /* navy — used for all H1–H4 colors */
  --status-ok:   #1F8A4C;
  --status-warn: #C98A00;
  --status-info: #0C71C3;
  --status-violet:#7A53C0;

  --ok-tint:     color-mix(in srgb, var(--status-ok)   13%, var(--card));
  --warn-tint:   color-mix(in srgb, var(--status-warn) 15%, var(--card));
  --info-tint:   color-mix(in srgb, var(--status-info) 11%, var(--card));
  --violet-tint: color-mix(in srgb, var(--status-violet) 12%, var(--card));
  --accent-tint: color-mix(in srgb, var(--accent)      12%, var(--card));
  --accent-line: color-mix(in srgb, var(--accent)      30%, var(--card));
}
.dark { --head: #F4EADF; }
```

### Status badge palette (use one of these everywhere)

Replace ad-hoc combos (`bg-amber-100 text-amber-700`, `bg-teal-100 text-teal-700`, etc.) with this systematic five:

| Status / meaning | Background | Text |
|---|---|---|
| On time / done / assigned | `var(--ok-tint)` | `var(--status-ok)` |
| Delayed / warning / stroller | `var(--warn-tint)` | `var(--status-warn)` |
| Early / landed / info | `var(--info-tint)` | `var(--status-info)` |
| Cancelled / error | `color-mix(in srgb, #D8392B 12%, var(--card))` | `var(--destructive)` |
| Round-trip / special | `var(--violet-tint)` | `var(--status-violet)` |
| Wheelchair / brand warmth | `var(--accent-tint)` | `var(--accent)` |

---

## Per-screen specifications

### 1 · LoginScreen.tsx — file: `src/app/components/LoginScreen.tsx`

**Reference design:** `designs/Login.html`

**Layout**
- Full-viewport flex column, background: `radial-gradient(60% 50% at 85% 8%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 60%), radial-gradient(55% 45% at 8% 92%, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 55%), var(--background)`
- 4px gradient bar across the top: `linear-gradient(90deg, var(--accent), var(--primary))`
- Centered card: max-width `392px`, padding `40px 34px 30px`, border-radius `22px`, border `1px solid var(--border)`, shadow `0 12px 40px rgba(40,25,10,0.16)`

**Components**
- **Brand emblem** — 76×76px, border-radius 24px, background `linear-gradient(160deg, var(--accent) 0%, #A1431F 100%)`, white 38px plane icon, shadow `0 10px 28px color-mix(in srgb, var(--accent) 38%, transparent)`
- **Title** — "Suhradam Parivar Shibir" · Rubik 600 · 24px · `var(--head)` · letter-spacing `-0.01em`
- **Subtitle** — "AIRPORT TRANSPORTATION" · 12px · `var(--muted-foreground)` · letter-spacing `0.14em` · uppercase
- **Sign-in button** — full width, white bg, 1.5px border `var(--border)`, padding 13px, font 15px/600 `var(--head)`, Google icon (existing), hover: border `var(--accent-line)`, bg `var(--secondary)`, shadow on hover
- **Role hint** — lock icon + "Access is granted based on your assigned role" · 12px · muted
- **Terms footer** — 12.5px muted with `<a class="text-primary">` for links
- Theme toggle (sun/moon) fixed top-right, 40×40 iconbtn

**Behavior**
- Google OAuth flow unchanged (per existing `useGoogleLogin`)
- The role-chooser modal in the prototype is **demo-only** — do not implement; routing already happens via `onLogin(role, name, id)` in `App.tsx`

---

### 2 · DriverScreen.tsx — file: `src/app/components/DriverScreen.tsx`

**Reference design:** `designs/Sarthi Pickup Tool.html` (open in a phone-width viewport to see mobile layout; desktop shows iPhone frame)

This is the most heavily redesigned screen. The data model in `Pickup` and `SarthiInfo` is unchanged — only presentation.

**Layout**
- Single column, `max-width: 720px` centered on tablet+, full-bleed on phone
- Sticky header with rounded bottom corners (`border-radius: 0 0 26px 26px`), padding `var(--safe-top) 18px 18px`
- Background: `var(--background)`

**Header**
- Top row: 46×46 circular avatar (terracotta bg, white initial), greeting "Jai Swaminarayan" (12.5px muted) + Sarthi name (1.18em 600 navy), bell iconbtn with red badge
- Progress block: left side "Today · Sun, 14 Jun 2026" (12.5px muted) + "1 / 7 pickups" (1.7em 700 navy) + "1 of 17 passengers picked up" (12.5px muted) ; right side: circular progress ring 74×74, stroke 7px, color `var(--accent)`, with center % text
- Next-up strip: small card with `bg: var(--accent-tint)`, border `1px solid var(--accent-line)`, padding `11px 14px`, radius 14px. Left icon tile (terracotta bg), middle "NEXT PICKUP" + flight info, right time + chevron

**Filter tabs** — segmented control: All / Pending / Done, each with a count badge. Active state: white bg, navy text, accent-colored count badge

**Pickup card**
- Grid `42px 20px 1fr`: time rail | timeline node | card
- Time rail: HH:MM (0.92em 700 navy) above AM/PM (0.62em muted)
- Node: 2px vertical line (`var(--border)`), 13px dot (status colored), 3px ring matching `var(--background)`
- Card itself:
  - `border: 1px solid var(--border)`, `border-radius: 17px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.04)`
  - **"Next" cards:** `border-color: var(--accent)`, border-width 1.5px, shadow `0 4px 16px var(--accent-shadow)`, plus a top strip `padding: 4px 14px` `bg: var(--accent)` `color: white` `text: "NEXT PICKUP"` (uppercase, 0.62em, letter-spacing 0.14em)
  - **Done cards:** opacity 0.62, left edge 4px solid `var(--status-ok)`
  - **Flight banner** (sub-bar at top): `bg: var(--secondary)`, 8px×16px padding, type icon + flight + "Arrival/Departure" + terminal + status pill (right-aligned). For delayed flights: banner bg `var(--warn-tint)`, banner text `var(--status-warn)`
  - **Body**: passenger name (1.12em 600 navy, line-through when done), meta chips row (passengers count, mandal, stroller/wheelchair badge)
  - **Footer**: `border-top: 1px solid var(--border)`, `bg: var(--secondary)`, two icon buttons (Call → tel:, Navigate → maps:) 38×38 outline blue, plus "Mark done" / "Done ✓" toggle pill on right (outline → filled green when done)
- Tapping the card opens a **detail bottom sheet** (see below)

**Detail bottom sheet** (slides up from below)
- Backdrop: `rgba(20,12,6,0.42)`, 280ms fade
- Sheet: full width, top corners radius 26px, bg `var(--card)`, max-height 88%, shadow `0 -8px 40px rgba(0,0,0,0.2)`
- 40×5 handle bar, name (1.4em 700), close X
- Flight-info card (border, radius 14px) with status banner + 3×2 info grid (Arrives, Terminal, Passengers, Mandal, Phone, Special needs)
- 3 big buttons: Call (blue filled), WhatsApp (green filled), Navigate (outline)
- Full-width "Mark as picked up" toggle button

**Toast** — used for Call / Navigate / WhatsApp / complete feedback: bottom-center, navy bg, white text, 13px medium, 220ms fade

**Empty / loading states** preserved from existing implementation.

**Tweaks** in the prototype are exploration-only — do not port.

---

### 3 · TransportScreen.tsx — file: `src/app/components/TransportScreen.tsx`

**Reference design:** `designs/Transport Admin.html`

Existing tabs and tab order are preserved: Bhaktos Dashboard, Arrival, Departure, Sarthi Roster, Vehicles.

**Top bar**
- Sticky, height 68px (was 76px), bg `color-mix(in srgb, var(--card) 92%, transparent)`, backdrop-filter `blur(10px) saturate(140%)`, 1px bottom border
- Brand mark on the left: 42×42, terracotta bg, white 22px sparkle icon, border-radius 12px, shadow `0 3px 10px color-mix(in srgb, var(--accent) 35%, transparent)`
- Title "Transportation Admin" 15px 600 navy + admin name 12px muted uppercase letter-spaced
- 40×40 iconbtns on the right: theme toggle + sign out

**Tab bar**
- Sticky below topbar, 50px tall, gap 2px between tabs
- Each tab: 18px horizontal padding, 14px/600, icon + label
- Active: color `var(--accent)`, 3px bottom border `var(--accent)` (was blue `#067BC2`)
- Inactive: `var(--foreground)`, hover → accent

**Summary cards** (Arrival/Departure)
- Single 3-column grid, gap 14px
- Card: 16×18 padding, border-radius 12px, 1px border, subtle shadow
- Layout: 34×34 colored icon tile (tinted bg, full color icon) + 12px muted label, then 30px 700 value, then 12px sub
- Status colors: blue for bookings count, terracotta for Sarthis, green for assignments done

**Date filter pills**
- 999px pills, 12.5px 600, 5×11 padding, 1px border
- Inactive: `bg var(--card)`, `color var(--muted-foreground)`, border `var(--border)`
- Active: `bg var(--accent)`, white text, no border
- Hover (inactive): border `var(--accent-line)`, text `var(--accent)`

**Flight group card** (`FlightGroupView.tsx → FlightGroupCard`)
- Border 1px, radius 12px, bg card, shadow 0 1px 2px
- Header is a `<button>` (full width, text-left, hover bg `var(--secondary)`)
- **Time block**: 66px wide, radius 9px, padding 8×6, centered text
  - On-time: `bg var(--accent-tint)`
  - Delayed: `bg var(--warn-tint)`
  - Early: `bg var(--info-tint)`
  - Children: "ARR"/"DEP" (10px 700 0.07em muted), scheduled time (17px 700 navy — strikethrough 13px muted if actual differs), actual time (15px 700 colored), diff badge (10px 700, status tint background)
- Flight title row: flight number (15px 700 navy), airline (13px muted), terminal tag, status badge — use the systematic status palette above
- "From X" / "To Y" line with plane icon, 12.5px muted
- Two meta lines: passengers + bookings count; assignments progress (green when complete, warn when not)
- Chevron at the right end
- **Passenger rows** (when expanded): same `pax-row` pattern as the Sarthi roster. When assigned, row bg is `var(--ok-tint)` and the Sarthi appears as a green "assigned chip" with a Remove link. Unassigned shows a `select.select-sm` with all Sarthis (showing capacity)

**Sarthi Roster tab** — a card with `pax-row` entries: avatar, name, phone + email line, vehicle line ("Toyota Sienna · NJ ABC-1234 · 7 seats" or italic muted "No vehicle assigned"), and a green "Sarthi" badge on the right

**Vehicles tab** — same row pattern but with a truck-icon avatar (blue tint), make + model + type tag + capacity, vehicle number, and a Sarthi-assignment `<select>` on the right (mirrors current behavior)

---

### 4 · SuperAdminScreen.tsx — file: `src/app/components/SuperAdminScreen.tsx`

**Reference design:** `designs/Super Admin.html`

Existing tabs preserved: Users, Notification Templates, Vehicles.

**Users tab**
- 4 stat cards (Total Users / Super Admins / Transport Admins / Sarthis) using the same stat-card pattern as Transport Admin
- Role colors: total → terracotta, super_admin → violet, transportation_admin → blue, driver → green
- Toolbar: search input + segmented role filter ("All / Super Admin / Transport Admin / Sarthi") — use a single segmented control, not the current dropdown approach
- Add User button: filled terracotta primary, plus icon
- **Add User form**: dashed 1px terracotta border, `bg var(--accent-tint)`, 20px padding, 2-column field grid, primary button "Add & send invite"
- User row pattern: avatar, name, email + phone meta line, role badge, edit + delete iconbtns (34×34)

**Notification Templates tab**
- Segmented control for channel: Email | SMS
- Per-template card:
  - Header: `bg var(--secondary)`, channel icon + name + small uppercase channel tag
  - Body: editable subject (email only) + body textarea
  - Variables row: monospace 11.5px chips with bg `var(--info-tint)` / color `var(--primary)` showing each `{{var}}` parsed from the template
  - Save / Reset buttons

**Vehicles tab**
- Add Vehicle filled-terracotta button, opens dashed-border form (same pattern as Users)
- Vehicle row: blue truck-icon avatar, make/model + type tag + seat count, vehicle number + "assigned to NAME" line, edit + delete iconbtns

---

## Component patterns to extract

Add these as either Tailwind utilities (in `theme.css`) or shared components. They appear everywhere:

| Pattern | Spec |
|---|---|
| `.btn--accent` | bg `var(--accent)`, color white, padding 10×18, radius 9px, 14px 600, hover bg `#A1431F` (or var(--accent)/82% to black mix) + shadow |
| `.btn--primary` | bg `var(--primary)`, white, same shape, hover bg `var(--primary-strong)` |
| `.btn--secondary` | bg `var(--card)`, color `var(--primary)`, border 1px primary |
| `.btn--ghost` | transparent, color foreground, hover bg `var(--muted)` |
| `.iconbtn` | 40×40, radius 11px, bg `var(--muted)`, border 1px `var(--border)`, hover bg `var(--accent-tint)` + border `var(--accent-line)` |
| `.stat` | The summary card |
| `.badge` | 12px 600, radius 999, padding 3×9, with status variants |
| `.tag` | 12px 500, radius 6px, padding 3×8, neutral chip |
| `.avatar` | 36×36 circle, accent-tint bg, accent-strong text (or blue variant) |

Top bar's terracotta brand mark with shadow appears on Transport Admin, Super Admin, and the hub — extract as a reusable component.

---

## Interactions

- **Tab switching** — instant, no animation; scrolls to top
- **Hover states** — 140ms ease on color/background/border, no large transforms
- **Cards** — clickable cards: `:active { transform: translateY(1px) }` or `scale(0.99)`, not big lifts
- **Bottom sheet** — translateY animation, 320ms `cubic-bezier(.32,.72,.3,1)`, backdrop fade 280ms
- **Toast** — `opacity` + `translateY(0 → 16px)`, 220ms, auto-dismiss at 1900ms
- **Theme toggle** — instant; persists to `localStorage` under key `sps-theme` (or wire into existing `useTheme()` hook unchanged)
- **Progress ring** — `stroke-dashoffset` transitions 500ms `cubic-bezier(.4,0,.2,1)`
- **Status calculation** in flight groups: keep existing `diffLabel` logic (minute diff between sched/actual)

## Responsive behavior

- Topbar: keep `container max-width: 1240px` with 28px side padding (20px on tablet, 16px on mobile)
- Stat card grid: `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))` — auto-wraps
- DriverScreen: phone-fullscreen at viewport ≤ 520px, otherwise inset content at 720px max (existing component is fine; just confirm typography scales).
- Bhaktos table: keep horizontal scroll, but bump `font-size` of `td` from 0.82rem to 13.5px for legibility

## Typography

Already correct in the codebase — Rubik 500/600 — keep `body { font-family: 'Rubik', ... }`. Do **not** introduce other fonts.

Confirmed scale:
| Use | Size | Weight | Color |
|---|---|---|---|
| Page H1 | 30px | 500 | `var(--head)` |
| Section H2 | 18px | 600 | `var(--head)` |
| Card title | 15px | 600 | `var(--head)` |
| Body | 14px | 500 | `var(--foreground)` |
| Small / meta | 12.5–13px | 500 | `var(--muted-foreground)` |
| Caption / eyebrow | 11–12px | 600 | `var(--muted-foreground)` (often `0.08em` letter-spacing, uppercase) |
| Stat value | 30px | 700 | `var(--head)` |

## Files in this bundle

Inside `designs/`:
- `Redesign Guide.html` — strategy & rationale (don't implement)
- `index.html` — hub linking the four screens
- `Login.html` — Login redesign reference
- `Sarthi Pickup Tool.html` — DriverScreen redesign reference (+ `sarthi-app.jsx`, `ios-frame.jsx`, `tweaks-panel.jsx`)
- `Transport Admin.html` — TransportScreen redesign reference
- `Super Admin.html` — SuperAdminScreen redesign reference
- `sps-theme.css` — full design-system stylesheet (the "Direction A" delivery — use as the source of truth for tokens & component styles)
- `sps-ui.js`, `sps-data.js` — icons / mock data used by the prototypes

## Implementation suggested order

1. **Tokens first** — paste the new `:root` and `.dark` blocks into `src/styles/theme.css`. Verify all screens still build (most will look different but functional).
2. **Replace inline hex literals** — global search for `#0C71C3`, `#067BC2`, `#173D61`, `#494D52`, `#999999`, `#CCCCCC`, `#FEF2E6` in the components and replace with the matching Tailwind class (`text-primary`, `text-foreground`, `border-border`, `bg-secondary`, etc.) or CSS var. The existing `CLAUDE.md` flags this as a known constraint.
3. **Status badges** — extract a `<StatusBadge variant="ok|warn|info|danger|violet|accent">` and use it everywhere ad-hoc colored pills currently exist.
4. **Screen by screen** in this order: LoginScreen → DriverScreen → TransportScreen → SuperAdminScreen. Login is the smallest; Driver is the biggest visual lift.
5. **Dark mode pass** — every change must read both light and dark. The prototypes have working dark mode for reference.

## Assets

No images, no fonts to ship. Rubik is loaded from Google Fonts (already in the codebase). Icons remain `lucide-react`.

## Out of scope

- The role-chooser modal on the Login prototype is demo-only
- The Tweaks panel on the Sarthi prototype is exploration UI
- The `Redesign Guide.html` is for context only

---

Good luck. Open `designs/index.html` and click through the four screens before you start — it's the single best way to internalize the system.
