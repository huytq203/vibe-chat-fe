---
name: Halo
description: An edge-to-edge communication workspace with native-feeling mobile operation and compact desktop productivity.
colors:
  primary-cyan: "#06b6d4"
  canvas-charcoal: "#111318"
  sidebar-charcoal: "#0d1017"
  text-cool-white: "#e2e8f0"
  border-charcoal: "#1e2129"
  danger-red: "#ef4444"
  scrollbar-light: "#c0c2d1"
  scrollbar-dark: "#2a2740"
  scrollbar-dark-hover: "#3d3860"
typography:
  nav-badge:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "9px"
    fontWeight: 700
    lineHeight: 1
  nav-label:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1
  title:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
  caption:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  heading-sm:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.33
  heading-md:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
  heading-lg:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
  page-title:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.29
  public-title:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
  editor-title:
    fontFamily: "Be Vietnam Pro, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.22
rounded:
  hairline: "1.5px"
  xs: "3px"
  sm: "6px"
  md: "8px"
  control: "10px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary-cyan}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  input-default:
    backgroundColor: "{colors.canvas-charcoal}"
    textColor: "{colors.text-cool-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
---

# Design System: Halo

## Overview

**Creative North Star: "The Edge-to-Edge Workspace"**

Halo is an Operate-mode interface: fast scanning, clear state, and reliable task completion outrank decorative expression. Mobile should feel like an installed app without imitating one operating system; desktop should retain the density and independent card surfaces that make multi-panel work efficient.

Framework7 owns the mobile app shell, platform classes, safe-area tokens, and native bar geometry. Next.js App Router remains the sole owner of URLs, history, deep links, and route transitions. Base UI and Halo's existing primitives remain the owners of dialogs, alerts, popovers, fields, and buttons; do not replace them wholesale with Framework7 components.

**Key Characteristics:**

- Edge-to-edge colored surfaces with insets applied only to controls and readable content.
- Cyan action emphasis over layered charcoal surfaces.
- Linear, route-like mobile workflows and compact, multi-surface desktop workflows.
- Consistent focus visibility, 44px mobile targets, and restrained motion.

## Colors

Use semantic CSS tokens such as `--background`, `--sidebar`, `--foreground`, `--primary`, `--border`, and `--danger`; themes redefine these roles. Framework7 color variables must alias Halo tokens rather than introduce a parallel palette.

## Typography

Be Vietnam Pro is the UI, body, and display family, with system sans-serif fallbacks. Favor compact hierarchy: bold 16–18px page and panel titles, 13–14px body copy, and 10–12px navigation or metadata labels. Preserve Vietnamese diacritics, avoid forced uppercase, and prevent iOS input zoom with a computed mobile field size of at least 16px.

## Layout

The app shell fills the viewport and does not receive safe-area padding. On mobile, content surfaces paint through the notch and home-indicator regions while headers, toolbars, composers, and other controls absorb the relevant inset.

- Framework7 exclusively owns `html`, `body`, and `.framework7-root` viewport geometry. Do not add fixed positioning or `vh`/`dvh`/`lvh` heights to `body`; real iOS can end that box immediately above the home-indicator region.
- `visualViewport` may detect the software keyboard and toggle `data-keyboard='open'`, but it must never write application height. Native viewport resizing remains authoritative.
- `--f7-safe-area-*` is the canonical inset source; `--safe-*` aliases exist for incremental migration.
- For ordinary padding, use `max(var(--safe-bottom), <baseline>)`. Do not add the baseline with `calc()` unless the design intentionally needs both the full inset and extra breathing room.
- Horizontal controls use `max(var(--safe-left/right), <baseline>)` or a control-scoped safe-area utility. Never pad the entire shell.
- The principal responsive boundary is `768px`: mobile is single-task and page-oriented; desktop preserves independent cards and multi-column layouts.

## Elevation & Depth

Halo is flat by default and separates regions with tonal contrast and quiet borders. Use `--shadow-micro` for small lifted controls and `--shadow-subtle` for floating desktop cards; strong shadows belong only to true overlays. Mobile full-screen pages should not look like floating cards.

## Shapes

Controls use 8–12px corners, large panels and dialogs use 16px, and floating desktop cards use 20px. Full-screen mobile pages remove radius, border, and shadow so their background reaches every physical edge.

## Components

### Buttons and fields

Buttons use semantic variants and a visible two-pixel focus ring. Inputs use semantic background/border tokens, show errors with `--danger`, and retain explicit labels. Mobile buttons, toggles, inputs, and icon controls must provide at least a 44×44px interaction target even when the visual glyph is smaller.

### Bottom navigation

Use Framework7 `Toolbar` only for the embedded mobile conversation dock. Its painted surface reaches the bottom edge; Framework7 adds the bottom safe inset to the 64px control region. Keep dock controls horizontally clear of landscape insets. The dock uses `z-index: 20`, below dialogs (`100`), confirmation alerts (`110`), and transient menus/popovers (`200`). Desktop uses the existing independent rounded card and must not acquire Framework7 toolbar geometry.

### Dialogs and temporary overlays

Substantial dialogs default to route-like full-screen pages below `768px`: they have a safe-area-aware header, a visible Back action, scrollable content, and one browser-history entry. Back closes the page before leaving its underlying Next.js route, and Forward restores it. On desktop, preserve the centered, bounded dialog.

Use `mobileRoute={false}` for genuinely small temporary overlays that should retain modal geometry and a visible close affordance. Confirmation alerts and popovers remain overlays; do not turn them into pages. Full-bleed dialog layouts may remove horizontal/top gutters but must preserve bottom safe-area padding.

## Do's and Don'ts

### Do:

- **Do** keep Next.js as the only URL router and initialize Framework7 through the shared PWA integration module.
- **Do** color surfaces edge-to-edge and inset the controls inside them.
- **Do** use `max()` to choose between a safe inset and normal spacing.
- **Do** retain visible focus, semantic landmarks, labels, active state, and reduced-motion behavior.
- **Do** preserve desktop cards, panels, and bounded dialogs when mobile adopts a page treatment.

### Don't:

- **Don't** mount a Framework7 `View` or create a second navigation history.
- **Don't** apply safe-area padding to the app shell or leave controls beneath the home indicator/notch.
- **Don't** let Framework7's global resets or default z-index values override Halo component contracts.
- **Don't** show a substantial mobile workflow inside a cramped centered modal.
- **Don't** shrink mobile interaction targets below 44px or rely on hover alone.
