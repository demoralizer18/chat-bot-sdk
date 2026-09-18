/**
 * icons.js — All SVG icon strings used by the Brook Hollow Chat Widget.
 *
 * Rules for every icon:
 *  1. No `currentColor` — all fill/stroke values are explicit (white or #2bc560).
 *     This guarantees they render correctly inside any button regardless of
 *     inherited CSS colour.
 *  2. No external references — fully self-contained inline SVG.
 *  3. aria-hidden="true" is NOT set here; callers add it in HTML context.
 */

/**
 * FAB icon — white speech bubble with three green dots.
 * Solid fill only; cannot go invisible on the green FAB background.
 */
export const ICON_FAB = `<svg width="24" height="24" viewBox="0 0 32 32"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="white"
    d="M4 4h24a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-9l-5 5v-5H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
  <circle cx="11" cy="14" r="2" fill="#2bc560"/>
  <circle cx="16" cy="14" r="2" fill="#2bc560"/>
  <circle cx="21" cy="14" r="2" fill="#2bc560"/>
</svg>`;

/**
 * FAB close icon — horizontal dash (–).
 * Shown in place of ICON_FAB when the panel is open; signals "collapse".
 */
export const ICON_FAB_CLOSE = `<svg width="20" height="20" viewBox="0 0 20 20"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <line x1="4" y1="10" x2="16" y2="10"
    stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

/**
 * Header / panel avatar — AI robot face on a white circle.
 * Placed in the green header; white circle background ensures contrast.
 *
 * Anatomy (all coordinates are absolute):
 *   - White disc (r=18) as background
 *   - Green rounded-rect = robot head (x8,y13 w20 h14 rx4)
 *   - White rect eyes × 2 with green circular pupils
 *   - White rect mouth
 *   - Green antenna stem + tip circle above the head
 */
export const ICON_BOT_HEADER = `<svg width="36" height="36" viewBox="0 0 36 36"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="18" cy="18" r="18" fill="white"/>
  <rect  x="8"  y="13" rx="4" ry="4" width="20" height="14" fill="#2bc560"/>
  <rect  x="11" y="17" rx="1.5" ry="1.5" width="5" height="4" fill="white"/>
  <rect  x="20" y="17" rx="1.5" ry="1.5" width="5" height="4" fill="white"/>
  <circle cx="13.5" cy="19" r="1.2" fill="#2bc560"/>
  <circle cx="22.5" cy="19" r="1.2" fill="#2bc560"/>
  <rect  x="13" y="23" rx="1" ry="1" width="10" height="2" fill="white"/>
  <rect  x="17" y="7"  rx="1" ry="1" width="2"  height="6" fill="#2bc560"/>
  <circle cx="18" cy="6.5" r="2" fill="#2bc560"/>
</svg>`;

/**
 * Message thread avatar (28px) — same robot face, smaller.
 * Sits beside each bot message bubble.
 */
export const ICON_BOT_AVATAR = `<svg width="28" height="28" viewBox="0 0 28 28"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="14" cy="14" r="14" fill="#2bc560"/>
  <rect  x="7"    y="10" rx="3"   ry="3"   width="14"  height="10" fill="white"/>
  <rect  x="9.5"  y="13" rx="1"   ry="1"   width="3.5" height="3"  fill="#2bc560"/>
  <rect  x="15"   y="13" rx="1"   ry="1"   width="3.5" height="3"  fill="#2bc560"/>
  <rect  x="10"   y="18" rx="0.8" ry="0.8" width="8"   height="1.5" fill="#2bc560"/>
  <rect  x="13"   y="5"  rx="0.8" ry="0.8" width="2"   height="5"  fill="white"/>
  <circle cx="14" cy="5" r="1.5" fill="white"/>
</svg>`;

/**
 * Close × — two explicit white lines.
 * Background circle (rgba dark) is set in CSS on #bhc-hdr-close.
 * stroke="white" is hard-coded — never inherits and never goes invisible.
 */
export const ICON_CLOSE = `<svg width="12" height="12" viewBox="0 0 12 12"
  xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <line x1="1"  y1="1"  x2="11" y2="11" stroke="white" stroke-width="2" stroke-linecap="round"/>
  <line x1="11" y1="1"  x2="1"  y2="11" stroke="white" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/**
 * Send / Enter arrow — ↵ return-key shape.
 *
 * Three polylines compose the classic "enter" glyph:
 *   1. Vertical descender on the right (top of the ↵)
 *   2. Horizontal arm going left
 *   3. Arrowhead pointing left-down at the end of the horizontal arm
 *
 * stroke="white" is explicit — always visible on the green send button.
 */
export const ICON_SEND = `<svg width="18" height="18" viewBox="0 0 24 24"
  xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
  <polyline points="18,5 18,13"
    stroke="white" stroke-width="2.2" stroke-linecap="round"/>
  <polyline points="18,13 5,13"
    stroke="white" stroke-width="2.2" stroke-linecap="round"/>
  <polyline points="9,8 4,13 9,18"
    stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/**
 * Phone handset — used in the footer tel: link.
 * Fill colour is injected at call-site so it respects the brand red token.
 * @param {string} [color='#EE2B31']
 * @returns {string}
 */
export function ICON_PHONE(color = '#EE2B31') {
  return `<svg width="11" height="11" viewBox="0 0 24 24"
    fill="${color}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24
      11.36 11.36 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4
      a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"/>
  </svg>`;
}
