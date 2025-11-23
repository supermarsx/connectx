# ConnectX – Visual & UX Design Specification

> **Scope:** Purely visual & interaction design. No backend/system details.
> **Style keywords:** pastel bubble gum · soft brutalism · minimalism · friendly competitive

---

## 1. Brand & Mood

### 1.1 Brand Essence
- **Core feel:** Light‑hearted competition in a playful, candy‑like world.
- **Personality:**
  - Friendly, non‑intimidating, a little cheeky.
  - Clear and minimal, never cluttered.
  - Confident, with some bold brutalist blocks framing content.
- **Emotional targets:**
  - Quick hit of joy when opening the app.
  - Calm focus during play (no visual overload).
  - Subtle excitement on win, soft landing on loss.

### 1.2 Visual Metaphors
- **Board & pieces:** Candy machine / gumball vibes.
- **UI blocks:** Brutalist cards – solid, rectangular, sometimes asymmetrical sections.
- **Overall:** Mix of **soft gradients + hard layout grids**.

---

## 2. Color System

### 2.1 Global Palette (WCAG‑aware base)

**Backgrounds (Pastel Bubble Gum):**
- `BG-Base`: soft warm off‑white (#FAF7FB)
- `BG-Gradient-Primary`: top‑to‑bottom gradient from bubblegum pink (#FFB6C9) to lilac (#C9B6FF)
- `BG-Card`: very light lavender (#F3ECFF)

**Primary Accents:**
- `Accent-Pink`: #FF6FAF (primary CTA)
- `Accent-Mint`: #64E0C6 (secondary CTA, positive states)
- `Accent-Sun`: #FFD36B (highlight, your turn indicator)

**Neutrals (UI & text):**
- `Neutral-900`: #17171F (primary text on light backgrounds)
- `Neutral-700`: #444457 (secondary text)
- `Neutral-400`: #9C9CB1 (disabled, helper text)
- `Neutral-50`: #FFFFFF (cards on stronger gradients / dark modes)

**Feedback:**
- `Success`: #4CD08A (green)
- `Error`: #FF4B6E (warm red)
- `Warning`: #FFC155 (amber)

### 2.2 Player Piece Palettes
Each player has a **pair** of colors: a main fill and a slightly darker outline.

Example default palette set:
- Player 1: Bubble Pink (#FF6FAF fill, #E35591 outline)
- Player 2: Sky Blue (#6FC9FF fill, #4E9FD6 outline)
- Player 3: Lime Pop (#A4FF6F fill, #7AC848 outline)
- Player 4: Peach Soda (#FFB96F fill, #E28B49 outline)

Rules:
- Colors in the same match must differ in hue and brightness.
- For colorblind accessibility, provide **pattern overlays**:
  - P1: solid.
  - P2: diagonal stripe.
  - P3: dot pattern.
  - P4: cross‑hatch.

### 2.3 Mode‑Specific Color Cues
- **Classic mode:** Background gradient skewed towards **cooler lilac + sky blue**.
- **Full‑Board mode:** Background gradient skewed towards **warmer pink + peach**, blacked‑out cells use:
  - `Blocked-Cell`: very dark indigo (#1B1230) with low‑opacity pattern.

---

## 3. Typography

### 3.1 Typefaces
- **Display font:** Rounded, geometric sans (e.g., Poppins / Baloo style).
  - Used for logo, main headings, big numbers.
- **Body font:** Clean, neutral sans (e.g., Inter / SF‑like).
  - Used for buttons, labels, instructions, settings.

### 3.2 Type Scale (Mobile‑first)
- Title / Logo: 32–40 px
- Section headers: 24 px
- Sub‑headers: 18–20 px
- Body text: 14–16 px
- Caption / helper: 12–13 px

Rules:
- Never more than **3 sizes** visible at a time on a screen.
- Single line titles where possible; brutalist feel comes from **blocks & alignment**, not from overwhelming type.

---

## 4. Layout & Composition

### 4.1 Layout Principles
- **Soft brutalism:**
  - Big rectangular sections with clear separation (cards, headers).
  - Slightly exaggerated padding (24–32 px on mobile containers).
  - Minimal shadows; rely primarily on contrast and blocks.
- **Minimalism:**
  - Very few elements per screen.
  - Avoid decorative clutter; every element has a function.
  - Use whitespace generously around the board.

### 4.2 Grid & Spacing
- Base grid: 8 px unit.
- Board container:
  - Always centered horizontally.
  - On phones, board height ≈ 60–70% of vertical space.
  - On larger screens, board remains a square/rectangle with fixed max width; sidebars or top/bottom bars host controls.

### 4.3 Main Screens

**1. Splash / Home:**
- Top: Game logo in a pastel bubble card, slightly overlapping the background gradient.
- Center: Big “Play” button (Accent‑Pink), secondary options below.
- Background: Subtle moving gradient or parallax bubbles.

**2. Main Menu:**
- Stacked brutalist cards:
  - "Play Online"
  - "Play Local"
  - "Practice vs Bot"
  - "Leaderboards"
- Each card is a solid pastel block with minimal icon + label.

**3. Lobby:**
- Board preview thumbnail on top or left.
- Player slots represented as vertical cards with:
  - Avatar circle.
  - Name.
  - Selected piece color swatch.
- Host controls in a fixed bar at bottom.

**4. Game Screen:**
- **Top bar:**
  - Left: Back / options.
  - Center: Mode name + round indicator.
  - Right: Connection indicator, minimal icons.
- **Center:**
  - Board occupies main area.
  - Under board: Turn indicator (colored pill) with the current player's color.
- **Bottom bar:**
  - For each player: horizontal row of chips showing avatar + small piece icon + score.
  - On smaller devices, collapsible/swipable for 3–4 players.

### 4.4 Brutalist Blocks Usage
- Headers are often on solid rectangles that **cut into or overlap** the gradient background.
- Cards may have slightly mismatched edges (e.g., one corner square, others rounded) to hint at soft brutalism.
- Minimal drop shadows, but occasional **hard 1–2 px shadow** for retro/brutalist accent.

---

## 5. Board & Piece Design

### 5.1 Board
- Main board panel:
  - Rounded rectangle with subtle inner shadow.
  - Board holes: circular cutouts with a light inner gradient giving depth.

- **Classic mode:**
  - Board frame: very light blue‑lavender.
  - Empty cells: pale bluish‑white.

- **Full‑Board mode:**
  - Board frame: slightly deeper violet.
  - Blacked‑out cells: dark indigo with either:
    - Diagonal hatch pattern, or
    - Subtle X icon in very low opacity.

### 5.2 Pieces
- Shape: perfect circle with:
  - Soft inner gradient.
  - Highlight at top left.
  - Slight shadow on board.
- When hovering/selecting a column:
  - Ghost piece appears above the column, gently bobbing.

### 5.3 Connect N Visualization
- When a player wins:
  - The winning line of pieces gets:
    - Glow halo in their accent color.
    - Soft pulse animation (slow scale 1.0 → 1.08).
- Text banner overlays:
  - "Connect 5!" etc., on a brutalist slab at the top of the screen.

---

## 6. Interaction & Motion

### 6.1 Motion Principles
- Motion is **smooth, short, and weighty**.
- Purpose of motion:
  - Communicate state change (turn change, win, error).
  - Add delight without distracting.

### 6.2 Key Animations

- **Piece Drop:**
  - Duration: 220–280 ms.
  - Slight ease‑out curve.
  - On landing: tiny bounce (scale 1.0 → 1.05 → 1.0).

- **Turn Change:**
  - Turn indicator pill slides or fades to next player.
  - Background behind pill changes to player accent color.

- **Mode Switch (Classic vs Full‑Board):**
  - Quick crossfade with a 3D tilt or board flip is optional.
  - For Full‑Board, blacked‑out cells animate in from a transparent state.

- **Errors (e.g., full column click):**
  - Column header or ghost piece shakes horizontally for 120 ms.

### 6.3 Microinteractions
- Buttons:
  - Hover: lighten background, slightly raise.
  - Press: compress vertically a bit.
- Toggles & switches:
  - Capsule toggles using accent colors.
- Color picker for pieces:
  - Display color swatches in a grid; selected swatch gets a thick brutalist border.

---

## 7. Sound Design

### 7.1 Sound Palette
- **Overall:** Soft arcade / toybox.
- **No harsh beeps** or piercing tones.

### 7.2 Sound Events
- Piece drop: soft clack with slightly pitched variations.
- Turn change: gentle pop.
- Win: short rising chime, aligned with visual glow.
- Loss/draw: subdued, descending two‑note tone.

Include an easy access **mute / volume slider** in settings and from the main game UI (one tap away).

---

## 8. Accessibility & Inclusivity

### 8.1 Visual Accessibility
- Ensure sufficient contrast for text over gradients using semi‑opaque cards.
- Colorblind‑safe mode:
  - Patterns on pieces.
  - Alternative icon shapes if needed.
- Text size scaling up to +2 steps beyond default.

### 8.2 Motion & Comfort
- “Reduce motion” setting:
  - Disables board tilts, parallax, and non‑essential animations.
  - Keeps only critical motion (piece drops) but can even simplify those.

### 8.3 Cognitive Load
- Clear, concise labels.
- Only one big primary action per screen.
- Short, friendly prompts (e.g., "Your move, Pink!"), avoid jargon.

---

## 9. Theming & Personalization

### 9.1 Player Profile Customization
- Avatar options:
  - Simple pastel icons or minimal faces.
- Piece customization:
  - Pre‑set color themes categorized (Bubble, Ocean, Citrus, etc.).
  - Limit combos so they remain distinct in game.

### 9.2 Optional Themes (Later)
- Night mode:
  - Background gradient shifts to darker indigo / deep violet.
  - Board and pieces retain pastel feeling but slightly desaturated.

---

## 10. Platform‑Specific Guidelines

### 10.1 Mobile (Android & iOS)
- One‑handed reach: primary controls near bottom.
- Large tap targets (minimum 44x44 px).
- Avoid small text; ensure legibility on low‑end phones.

### 10.2 Desktop / Browser
- Board centered with side margins.
- Left or right panel can show:
  - Chat/emotes (if added in future).
  - Match details.
- Maintain visual consistency with mobile: same colors, type scale adjusted proportionally.

---

## 11. Brand Assets (Guidelines)

### 11.1 Logo
- Mark: stylized stack of 3–4 candy discs forming an X or staircase.
- Wordmark: rounded display font, slightly tracked out.
- Versions:
  - Full color on light.
  - Monochrome for small or dark contexts.

### 11.2 Icon
- App icon:
  - Rounded square with gradient background.
  - Central stacked discs in two pastel colors.
  - Thick border to work against any OS wallpaper.

---

## 12. Design Deliverables Checklist

- [ ] Color tokens & palette documentation.
- [ ] Typography scale and style guide.
- [ ] Component library (buttons, toggles, cards, modals, indicators).
- [ ] Board & piece component specification.
- [ ] Screen mocks: Splash, Menu, Lobby, Game (2–4 players), Win/Lose.
- [ ] Interaction prototypes for: piece drop, win animation, mode switch.
- [ ] Accessibility variants: colorblind patterns, reduce motion.
- [ ] Exported assets: logo, app icon, sample backgrounds.

This spec defines how ConnectX should **look and feel** across platforms, using a pastel bubble gum palette infused with soft brutalism and strict minimalism to create a playful yet focused competitive experience.

