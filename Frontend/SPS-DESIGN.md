# Design System Inspired by Harisumiran

## 1. Visual Theme & Atmosphere

Harisumiran's design embodies spiritual heritage with a modern, approachable interface. The visual identity balances reverence for tradition—evident in the terracotta and warm earth tones inspired by classical Indian temple architecture—with contemporary clarity and accessibility. The palette draws from natural materials and sacred spaces, creating an atmosphere of calm contemplation blended with welcoming warmth. Navigation is intuitive and uncluttered, allowing content about events, publications, and spiritual teachings to take center stage. The overall mood is dignified yet inviting, scholarly yet inclusive.

**Key Characteristics:**
- Warm earth tones anchored by deep charcoal and navy accents
- Generous whitespace for content breathing room
- Minimal ornamentation—clean, purposeful typography
- Accessible link colors with high contrast
- Soft shadow elevation for subtle depth
- Sacred, contemplative aesthetic with modern usability

## 2. Color Palette & Roles

### Primary
- **Primary Charcoal** (`#494D52`): Dominant text, body copy, and structural elements throughout the interface
- **Primary Dark Navy** (`#173D61`): Secondary headings and deeper accent applications

### Accent Colors
- **Accent Blue** (`#0C71C3`): Primary call-to-action elements and interactive highlights
- **Accent Bright Blue** (`#067BC2`): Alternative accent for links and hover states
- **Accent Sky Blue** (`#2EA3F2`): Tertiary accent for lighter interactive indicators
- **Warm Terracotta** (`#FFEADE`): Subtle background tints reflecting temple architecture

### Interactive
- **Link Blue** (`#067BC2`): Standard hyperlink color with high contrast
- **Link Bright Blue** (`#0C71C3`): Hover and focused link states
- **Nav Text Blue** (`#0C71C3`): Navigation menu text when interactive

### Neutral Scale
- **White** (`#FFFFFF`): Primary background and card surfaces
- **Cream Off-White** (`#FEF2E6`): Subtle secondary background
- **Light Cream** (`#FDF2EA`): Tertiary background for soft contrast
- **Very Light Cream** (`#FFF7EA`): Minimal background tint
- **Gray Text** (`#333333`): Secondary text and reduced-emphasis copy
- **Gray Divider** (`#999999`): Borders and dividing lines
- **Gray Stroke** (`#CCCCCC`): Subtle borders on containers
- **Black** (`#000000`): High-contrast text when needed

### Surface & Borders
- **Border Gray** (`#CCCCCC`): Card and component borders
- **Divider Gray** (`#999999`): Section separators

### Semantic / Status
- **Error Red** (`#E02B20`): Error messages and danger states
- **Error Dark Red** (`#CF2E2E`): Darker error variant for emphasis
- **Warning Yellow** (`#FCB900`): Warning states and cautionary messaging

## 3. Typography Rules

### Font Family
**Primary:** Rubik (https://fonts.googleapis.com/)
**Fallback Stack:** `Rubik, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Secondary:** Same as primary (system defaults for fallback)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display / H1 | Rubik | 30px | 500 | 30px | 0px | Large page headings; hero section titles |
| Heading / H2 | Rubik | 26px | 500 | 33.8px | 0px | Section headings; prominent content blocks |
| Body Text | Rubik | 14px | 500 | 22.1px | 0px | Primary body copy for articles and descriptions |
| Small Text / Span | Rubik | 13px | 500 | 23px | 0px | Secondary body text, captions, metadata |
| List Items | Rubik | 14px | 600 | 14px | 0px | Navigation lists and menu items; bold emphasis |
| Navigation | Rubik | 14px | 600 | 14px | 0px | Top navigation and primary menu text |
| Links | Rubik | 13px | 500 | 23px | 0px | Inline hyperlinks in body text |
| Button Text | Rubik | 14px | 600 | 14px | 0px | Call-to-action and interactive button labels |

### Principles
- **Moderate weight preference:** Rubik 500 and 600 weights dominate, avoiding extreme contrast
- **Generous line height:** All text uses line heights ≥ 1.5× font size for readability
- **Minimal letter spacing:** Default 0px maintains natural reading rhythm without artificial stretching
- **Semantic sizing:** Hierarchy clearly differentiated through size (30px → 14px → 13px) rather than weight alone
- **Accessibility:** All text meets WCAG standards; link colors maintain sufficient contrast against backgrounds

## 4. Component Stylings

### Buttons

**Primary Button**
- **Background:** `#0C71C3`
- **Text Color:** `#FFFFFF`
- **Font Size:** `14px`
- **Font Weight:** `600`
- **Padding:** `12px 24px`
- **Border Radius:** `4px`
- **Border:** `none`
- **Line Height:** `14px`
- **Hover State:**
  - **Background:** `#067BC2`
  - **Box Shadow:** `rgba(0, 0, 0, 0.1) 0px 2px 5px 0px`
- **Active State:**
  - **Background:** `#173D61`

**Secondary Button**
- **Background:** `#FFFFFF`
- **Text Color:** `#0C71C3`
- **Font Size:** `14px`
- **Font Weight:** `600`
- **Padding:** `12px 24px`
- **Border Radius:** `4px`
- **Border:** `2px solid #0C71C3`
- **Line Height:** `14px`
- **Hover State:**
  - **Background:** `#FEF2E6`
  - **Border Color:** `#067BC2`
  - **Text Color:** `#067BC2`

**Ghost Button**
- **Background:** `transparent`
- **Text Color:** `#0C71C3`
- **Font Size:** `14px`
- **Font Weight:** `600`
- **Padding:** `12px 20px`
- **Border Radius:** `4px`
- **Border:** `1px solid transparent`
- **Line Height:** `14px`
- **Hover State:**
  - **Background:** `rgba(12, 113, 195, 0.08)`
  - **Border:** `1px solid #0C71C3`

### Cards & Containers

**Default Card**
- **Background:** `#FFFFFF`
- **Text Color:** `#494D52`
- **Font Size:** `13px`
- **Font Weight:** `500`
- **Padding:** `24px`
- **Border Radius:** `4px`
- **Border:** `1px solid #CCCCCC`
- **Box Shadow:** `rgba(0, 0, 0, 0.1) 0px 1px 0px 0px`
- **Line Height:** `22.1px`

**Elevated Card**
- **Background:** `#FFFFFF`
- **Text Color:** `#494D52`
- **Font Size:** `13px`
- **Font Weight:** `500`
- **Padding:** `24px`
- **Border Radius:** `8px`
- **Border:** `none`
- **Box Shadow:** `rgba(0, 0, 0, 0.1) 0px 2px 5px 0px`
- **Line Height:** `22.1px`

**Light Background Container**
- **Background:** `#FEF2E6`
- **Text Color:** `#494D52`
- **Font Size:** `13px`
- **Font Weight:** `500`
- **Padding:** `28px`
- **Border Radius:** `0px`
- **Border:** `none`
- **Box Shadow:** `none`

### Inputs & Forms

**Text Input - Default**
- **Background:** `#FFFFFF`
- **Text Color:** `#494D52`
- **Font Size:** `14px`
- **Font Weight:** `500`
- **Padding:** `12px 16px`
- **Border Radius:** `4px`
- **Border:** `1px solid #CCCCCC`
- **Line Height:** `22.1px`
- **Focus State:**
  - **Border Color:** `#0C71C3`
  - **Box Shadow:** `0px 0px 0px 3px rgba(12, 113, 195, 0.1)`

**Text Input - Error**
- **Background:** `#FFFFFF`
- **Text Color:** `#E02B20`
- **Font Size:** `14px`
- **Font Weight:** `500`
- **Padding:** `12px 16px`
- **Border Radius:** `4px`
- **Border:** `1px solid #E02B20`
- **Line Height:** `22.1px`

**Form Label**
- **Text Color:** `#494D52`
- **Font Size:** `14px`
- **Font Weight:** `600`
- **Margin Bottom:** `8px`
- **Line Height:** `14px`

### Navigation

**Top Navigation Bar**
- **Background:** `#FFFFFF`
- **Text Color:** `#494D52`
- **Font Size:** `14px`
- **Font Weight:** `600`
- **Padding:** `0px 32px`
- **Height:** `76px`
- **Line Height:** `14px`
- **Border Bottom:** `1px solid #CCCCCC`
- **Box Shadow:** `rgba(0, 0, 0, 0.1) 0px 1px 0px 0px`

**Navigation Link - Default**
- **Text Color:** `#0C71C3`
- **Font Size:** `14px`
- **Font Weight:** `600`
- **Padding:** `0px 20px`
- **Line Height:** `14px`
- **Hover State:**
  - **Text Color:** `#067BC2`
  - **Border Bottom:** `2px solid #067BC2`

**Navigation Link - Active**
- **Text Color:** `#067BC2`
- **Font Size:** `14px`
- **Font Weight:** `600`
- **Border Bottom:** `3px solid #067BC2`
- **Padding:** `0px 20px`
- **Line Height:** `14px`

**Dropdown Menu**
- **Background:** `#FFFFFF`
- **Text Color:** `#494D52`
- **Font Size:** `13px`
- **Font Weight:** `500`
- **Padding:** `12px 16px`
- **Border Radius:** `4px`
- **Border:** `none`
- **Box Shadow:** `rgba(0, 0, 0, 0.1) 0px 2px 5px 0px`
- **Hover Item Background:** `#FEF2E6`

## 5. Layout Principles

### Spacing System

**Base Unit:** `4px`

**Scale:**
- `4px`: Micro spacing for inline adjustments
- `8px`: Tight grouping between closely related elements
- `12px`: Padding within small components
- `16px`: Standard inter-element margin
- `20px`: Content padding within cards
- `24px`: Card padding; section margins
- `28px`: Large component padding
- `32px`: Page section margins; container padding
- `36px`: Extra large spacing between major sections
- `56px`: Hero section bottom margin
- `64px`: Full-page section spacing
- `76px`: Maximum spacing; navigation height alignment

**Usage Context:**
- **Inline/Micro:** `4px`, `8px` — text emphasis, icon spacing
- **Component Interior:** `12px`, `16px`, `20px` — padding within buttons, inputs, cards
- **Section Spacing:** `24px`, `32px`, `36px` — margins between page sections
- **Major Breaks:** `56px`, `64px`, `76px` — hero sections, full-page layout resets

### Grid & Container

- **Max Width:** `1440px` (base container width from extracted tokens)
- **Column Strategy:** 12-column grid with `16px` gutters
- **Section Padding:** Horizontal `32px` on desktop, `20px` on tablet, `16px` on mobile
- **Content Margins:** Full-bleed images; contained text at `1440px` max
- **Nested Container Padding:** `24px` to `32px` depending on depth

### Whitespace Philosophy

Harisumiran employs generous whitespace to create contemplative, uncluttered layouts. Content breathing room is prioritized over density; section margins of `64px` and large card padding (`24px–32px`) encourage visual rest between major content blocks. Navigation and hero sections use full viewport width with ample internal padding, reinforcing the open, welcoming aesthetic. Nested elements (cards within sections) maintain consistent `20px–24px` padding to preserve hierarchy without visual chaos.

### Border Radius Scale

- **Sharp (0px):** Large container backgrounds, full-width sections
- **Subtle (4px):** Buttons, inputs, small cards, standard component elements
- **Rounded (8px):** Elevated cards, special feature containers
- **Full Rounded (50%):** Icon badges, avatar circles (where applicable)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (0) | No shadow; `box-shadow: none` | Background containers, card backgrounds, flat design sections |
| Subtle (1) | `rgba(0, 0, 0, 0.1) 0px 1px 0px 0px` | Navigation bars, standard cards, minimal elevation |
| Raised (2) | `rgba(0, 0, 0, 0.1) 0px 2px 5px 0px` | Dropdown menus, elevated cards, hover states on buttons |
| Deep (3) | `rgba(0, 0, 0, 0.15) 0px 4px 12px 0px` | Modals, overlays, floating action components (inferred) |

**Shadow Philosophy:**
Harisumiran uses restrained, single-axis shadows that enhance readability and component hierarchy without creating visual noise. The primary shadow (`0px 2px 5px`) is soft and diffused, creating gentle depth that guides focus toward interactive elements and elevated content. Shadows are reserved for interactive states (hover, dropdown) and layered containers, maintaining a predominantly flat, modern aesthetic that respects the site's serene, contemplative atmosphere.

## 7. Do's and Don'ts

### Do
- **Use Rubik 500 for body copy** — maintains brand consistency and readable weight across all content
- **Apply blue accents (`#0C71C3` or `#067BC2`) to all interactive elements** — links, buttons, hover states
- **Maintain `24px–32px` padding in containers** — creates the signature spacious, breathing layout
- **Use warm cream backgrounds (`#FEF2E6`, `#FDF2EA`) for secondary sections** — subtle visual separation without harsh contrast
- **Left-align navigation items with `20px` horizontal padding** — maintains clean, scannable menu structure
- **Apply the subtle shadow (`0px 1px 0px`) to standard cards** — provides just enough depth without visual clutter
- **Use `#494D52` for all primary text** — ensures consistent readability and brand voice
- **Reserve bold weight (600) for navigation and buttons only** — creates clear hierarchy
- **Apply ample vertical spacing (`56px–64px`) between major sections** — reinforces contemplative, unrushed aesthetic

### Don't
- **Don't mix more than two accent colors in a single component** — use `#0C71C3` as primary, `#067BC2` as hover only
- **Don't reduce padding below `12px` inside components** — preserves accessibility and visual comfort
- **Don't use font weights other than 500 or 600** — constrains typography to brand palette
- **Don't apply shadows to full-width background containers** — keep large sections flat for visual stability
- **Don't override Rubik with system fonts in display roles** — maintain visual consistency
- **Don't use error red (`#E02B20`) in decorative contexts** — reserve for semantic error/danger states only
- **Don't nest cards beyond two levels deep** — keeps layout hierarchy intelligible
- **Don't reduce line height below `1.4×` of font size** — ensures WCAG accessibility standards
- **Don't use condensed letter spacing** — Rubik's natural spacing is optimized for legibility

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | 320px–767px | Single column; `16px` side padding; hide secondary nav; font sizes -2px (headings); stack all cards vertically |
| Tablet | 768px–1023px | Two-column grid; `20px` side padding; condensed nav items; moderate font sizing |
| Desktop | 1024px–1439px | Three-column grid; `32px` side padding; full navigation visible; standard font sizes |
| Large Desktop | 1440px+ | Four-column grid; centered container at `1440px` max width; full navigation with dropdown support |

### Touch Targets

- **Minimum Touch Size:** `48px × 48px` for all interactive elements (buttons, links, form inputs)
- **Spacing Between Touch Targets:** Minimum `8px` horizontal/vertical clearance to prevent accidental activation
- **Link Tap Area:** Extend to `48px` height on mobile; `44px` minimum on tablet
- **Form Input Height:** `48px` on mobile, `44px` on desktop (including padding)

### Collapsing Strategy

- **Hero Images:** Scale responsively; maintain aspect ratio; use `object-fit: cover` on mobile
- **Multi-Column Layouts:** Collapse to single column below `768px`; reflow to two-column at tablet breakpoint
- **Navigation:** Transform to hamburger menu (collapse top nav to drawer) below `768px`; show full horizontal menu at `768px+`
- **Cards in Carousel:** Switch from grid layout to horizontal scrollable carousel on mobile (for event cards, media sections)
- **Padding Reduction:** Decrease from `32px` (desktop) → `20px` (tablet) → `16px` (mobile)
- **Font Scaling:** Maintain hierarchy but reduce display sizes by 4px–6px on mobile (H1: 30px → 24px)

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA:** Accent Blue (`#0C71C3`) background with white text
- **Secondary CTA:** White background with Accent Blue (`#0C71C3`) text and border
- **Background:** White (`#FFFFFF`) or Cream (`#FEF2E6`) for light contrast
- **Heading Text:** Primary Charcoal (`#494D52`)
- **Body Text:** Primary Charcoal (`#494D52`)
- **Links:** Link Blue (`#067BC2`); hover to `#0C71C3`
- **Borders:** Gray Stroke (`#CCCCCC`)
- **Shadows:** Soft black `rgba(0, 0, 0, 0.1)` at `0px 1px 0px` or `0px 2px 5px`
- **Error States:** Error Red (`#E02B20`)

### Iteration Guide

1. **Typography Foundation:** All text uses Rubik font; body copy is 14px weight 500; headings are 500 weight scaled 26px (H2) or 30px (H1); list items and navigation are bold (600).

2. **Color Discipline:** Primary charcoal (`#494D52`) dominates text; accent blue (`#0C71C3`) appears only on interactive elements (buttons, links, hover states); warm cream tints (`#FEF2E6`) provide subtle secondary backgrounds without harshness.

3. **Spacing Consistency:** All components use the `4px` base unit scale; standard padding is `24px`; section margins are `32px–64px` depending on importance; never reduce below `12px` on component interiors.

4. **Shadow Restraint:** Apply shadows only on hover states, dropdowns, and elevated cards; use `rgba(0, 0, 0, 0.1) 0px 1px 0px` for standard elevation, `rgba(0, 0, 0, 0.1) 0px 2px 5px` for raised states; keep most backgrounds flat.

5. **Border Radius Simplicity:** Use `0px` for large containers (hero sections, full-width backgrounds); `4px` for all buttons, inputs, standard cards; `8px` only for special elevated cards; avoid rounded corners on text or small inline elements.

6. **Navigation Consistency:** Top nav is `76px` tall with `14px` bold links spaced `20px` apart; link text is blue (`#0C71C3`); hover and active states use darker blue (`#067BC2`) with bottom border accent; maintain white background with subtle bottom shadow.

7. **Button Standardization:** Primary buttons are blue (`#0C71C3`) on white with `12px 24px` padding and `4px` radius; secondary buttons invert colors (white bg, blue text/border); all buttons use Rubik 600 at `14px`.

8. **Form Accessibility:** All inputs are `44px` tall minimum with `12px 16px` padding; focus states add blue border (`#0C71C3`) with light background tint `rgba(12, 113, 195, 0.1)`; error states use red (`#E02B20`) border and text; labels are bold 600 above each field.

9. **Responsive Adaptation:** Mobile layouts use single-column stacks with `16px` padding; tablet (768px+) shifts to two-column grids with `20px` padding; desktop (1024px+) maintains three-column layouts at `32px` padding; all fonts reduce by 2px on mobile while maintaining hierarchy ratios.

10. **Component Reusability:** Cards are white (`#FFFFFF`) with `24px` padding and subtle shadow; containers use either white or cream backgrounds; dropdowns appear on blue accent with crisp `0px 2px 5px` shadow; all interactive states transition smoothly without delay.