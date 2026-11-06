# 4. Design system

Date: 2026-11-06 – Accepted

## Context

The first interface read as formal and dated. Church leaders and ushers use Ecclesia mostly on phones, often mid-service, so it needs to feel quick, friendly and modern.

## Decision

- Bricolage Grotesque for headings and figures, Figtree for text.
- Emerald brand with gold for seasons, highlights and the demo banner. Deep emerald gradient panels carry the key moments: dashboard hero, service start, headcount total.
- All colours are CSS variables in globals.css with light and dark values. Dark mode follows the device unless the user picks light or dark.
- Large rounded cards, pill controls, mint icon tiles and soft shadows.
- Desktop gets a floating sidebar and a search bar. Phones get a bottom tab bar and an account menu.
- ⌘K opens a command menu for people, pages and actions.
- Saves confirm with a toast. Pages fade in once on navigation, and routes show skeletons while loading.
- Chart category colours are validated for colour blindness and contrast in both themes.

## Consequences

- New screens are built from the shared tokens and components only.
- Category colours chosen by churches should be checked against both themes before they are offered as presets.
