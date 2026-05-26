# Rdio-Inspired Design Direction

## Aesthetic Definition

This app uses an early-2010s Rdio-inspired music product aesthetic: soft skeuomorphic desktop chrome, bright library surfaces, thin typography, cyan-blue interaction states, and blurred-glass playback areas tinted by the listening context.

The reference point is not heavy realism. It is the moment between glossy OS X skeuomorphism and flat iOS 7 minimalism: subtle bevels, pale gradients, tactile controls, clean grids, and album-art-like color wash in the player.

## Reference Traits

- Bright, calm full-page workspace with a pale gray sidebar and white content canvas.
- OS X-inspired app header with inset search and soft top-bar gradients, without a faux desktop frame.
- Rdio blue as the primary active color, used sparingly for selected navigation and calls to action.
- Glassy teal playback surfaces, echoing Rdio's blurred-glass and artwork-tinted interface behavior.
- Thin dividers, small labels, quiet metadata, and generous whitespace.
- Controls that feel tactile through gradients, inset highlights, and restrained shadows.
- Music-first hierarchy: lists and schedules should feel like a library, not a dashboard.

## Typography

Primary font: `Google Sans`.

Rationale: Google Sans keeps the app close to its original local styling while preserving the friendly, rounded, humanist sans feel that works for this Rdio-inspired UI.

Weights:

- `300` for large section titles and spacious UI labels.
- `400` for normal navigation, row labels, and metadata.
- `700` for active labels, badges, and compact emphasis.

Fallback stack:

```css
font-family: "Google Sans", "Product Sans", "Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif;
```

## Color Palette

- Background black: `#050708`
- Window surface: `#f7f9f9`
- Content white: `#ffffff`
- Sidebar: `#f3f6f6`
- Primary text: `#30363a`
- Muted text: `#8a9599`
- Divider: `#e8eeee`
- Rdio blue: `#1598ca`
- Soft active blue: `#dff3fa`
- Player deep green: `#173e35`
- Player near-black green: `#09231f`
- Player current color: `#ffffff`
- Player muted current color: `rgba(255, 255, 255, 0.54)`

## Component Notes

- App shell should feel like a full-page desktop music client: chrome-inspired header on top, library on the left, content in the middle, playback fixed at the bottom.
- Navigation is small and calm. Active states turn blue instead of becoming heavy filled pills.
- Rows use fine top borders, light hover fills, and an inset blue edge for selection.
- The calendar month control uses subtle beveled buttons to match the OS X-era reference.
- Program detail panels use a glassy teal gradient to represent the album-art-tinted Rdio surface.
- The player bar should stay dark, atmospheric, and readable, with simple white transport controls.
- Player icons come from the shared icon set and inherit `currentColor`; set player foreground through theme tokens rather than per-icon colors.

## Sources

- Bryan Clark, "Rdio, You'll Be Missed.", Medium, November 24, 2015: https://medium.com/@bryanjclark/rdio-you-ll-be-missed-4322d2e7fbc4
