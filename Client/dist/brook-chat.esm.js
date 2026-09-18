/*!
 * Brook Hollow Chat SDK v1.0.0 (ESM)
 * https://www.brookhollowfamilydentistry.com
 *
 * Drop-in chat widget for the BROOK-RAG backend.
 * Zero external dependencies.
 *
 * Quick start:
 *   import BrookChat from './brook-chat.esm.js';
 *   BrookChat.init({ apiUrl: 'https://your-api.com' });
 *
 * Or with a bundler:
 *   import { ChatWidget, ChatClient } from './brook-chat.esm.js';
 *
 * © Brook Hollow Family Dentistry — MIT License
 */

// ─── Bundled CSS ────────────────────────────────────────────────────────────
const BUNDLED_CSS = `/**
 * Brook Hollow Chat Widget — Stylesheet
 * ======================================
 * All CSS custom properties are declared on #bhc-root so they can be
 * overridden by the host page for theming:
 *
 *   #bhc-root {
 *     --bhc-green:    #00b347;   /* swap brand colour *\\/
 *     --bhc-position: left;      /* not a real prop, just illustrative *\\/
 *   }
 *
 * Load order (choose ONE):
 *   <link rel="stylesheet" href="brook-chat.css">   ← then JS auto-skips injection
 *   or let the JS bundle inject it automatically (default, zero config).
 */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS — CSS custom properties
   Override any of these on #bhc-root to theme the widget.
───────────────────────────────────────────────────────────────────────────── */
#bhc-root {
  --bhc-green:        #2bc560;
  --bhc-green-dk:     #24a34a;
  --bhc-green-lt:     #f0fdf4;
  --bhc-red:          #EE2B31;
  --bhc-bg:           #f4f6f9;
  --bhc-white:        #ffffff;
  --bhc-txt:          #111827;
  --bhc-muted:        #6b7280;
  --bhc-border:       #e5e7eb;
  --bhc-border-lt:    #f0f2f4;
  --bhc-shadow-color: rgba(0,0,0,0.10);
  --bhc-radius-panel: 20px;
  --bhc-radius-bub:   18px;
  --bhc-font:         'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --bhc-z-fab:        2147483646;
  --bhc-z-panel:      2147483645;
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESET — scoped entirely inside #bhc-root so we never touch the host page
───────────────────────────────────────────────────────────────────────────── */
#bhc-root,
#bhc-root * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: var(--bhc-font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ─────────────────────────────────────────────────────────────────────────────
   FLOATING ACTION BUTTON (FAB)
───────────────────────────────────────────────────────────────────────────── */
#bhc-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: var(--bhc-z-fab);
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: linear-gradient(145deg, var(--bhc-green), var(--bhc-green-dk));
  box-shadow:
    0 4px 16px rgba(43, 197, 96, 0.45),
    0 1px 4px rgba(0,0,0,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  outline: none;
  overflow: hidden;
}
#bhc-fab:hover {
  transform: scale(1.07);
  box-shadow:
    0 6px 22px rgba(43, 197, 96, 0.55),
    0 2px 8px rgba(0,0,0,0.14);
}
#bhc-fab:focus-visible {
  outline: 3px solid var(--bhc-white);
  outline-offset: 3px;
}
#bhc-fab[data-open="true"] {
  background: linear-gradient(145deg, var(--bhc-green-dk), #1d8c3f);
}

/* Icon swap — chat ↔ dash */
#bhc-fab .fi {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease, transform 0.25s ease;
  line-height: 0;
}
.fi-chat {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}
.fi-dash {
  opacity: 0;
  transform: scale(0.5) rotate(90deg);
}
#bhc-fab[data-open="true"] .fi-chat {
  opacity: 0;
  transform: scale(0.5) rotate(-90deg);
}
#bhc-fab[data-open="true"] .fi-dash {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

/* Notification badge */
#bhc-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--bhc-red);
  border: 2px solid var(--bhc-white);
  display: none;
}
#bhc-badge.show { display: block; }

/* ─────────────────────────────────────────────────────────────────────────────
   CHAT PANEL
───────────────────────────────────────────────────────────────────────────── */
#bhc-panel {
  position: fixed;
  bottom: 92px;
  right: 24px;
  z-index: var(--bhc-z-panel);
  width: 368px;
  max-width: calc(100vw - 16px);
  height: 580px;
  max-height: calc(100svh - 110px);
  display: flex;
  flex-direction: column;
  background: var(--bhc-white);
  border-radius: var(--bhc-radius-panel);
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.06),
    0 4px 12px rgba(0,0,0,0.06),
    0 12px 32px var(--bhc-shadow-color),
    0 24px 64px var(--bhc-shadow-color);

  /* Hidden state */
  transform: translateY(16px) scale(0.96);
  transform-origin: bottom right;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity   0.22s ease,
    transform 0.26s cubic-bezier(0.34, 1.4, 0.64, 1);
}

/* Open state — driven by JS adding .open */
#bhc-panel.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HEADER
───────────────────────────────────────────────────────────────────────────── */
#bhc-hdr {
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--bhc-green) 0%, var(--bhc-green-dk) 100%);
  padding: 16px 14px 16px 18px;
  display: flex;
  align-items: center;
  gap: 11px;
}

#bhc-hdr-av {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255,255,255,0.22);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.3);
}

#bhc-hdr-text {
  flex: 1;
  min-width: 0;
}

#bhc-hdr-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--bhc-white);
  line-height: 1.3;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#bhc-hdr-status {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
}

/* Online pulse dot */
.bhc-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #86efac;
  flex-shrink: 0;
  animation: bhcPulse 2.4s infinite;
}
@keyframes bhcPulse {
  0%, 100% { opacity: 1;   transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}

#bhc-hdr-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.88);
  font-weight: 500;
  line-height: 1;
}

/* Close button */
#bhc-hdr-close {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0,0,0,0.15);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
  outline: none;
}
#bhc-hdr-close:hover     { background: rgba(0,0,0,0.28); }
#bhc-hdr-close:focus-visible {
  outline: 2px solid rgba(255,255,255,0.7);
  outline-offset: 2px;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MESSAGES AREA
───────────────────────────────────────────────────────────────────────────── */
#bhc-msgs {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--bhc-bg);
  scroll-behavior: smooth;
}
#bhc-msgs::-webkit-scrollbar       { width: 4px; }
#bhc-msgs::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
#bhc-msgs::-webkit-scrollbar-track { background: transparent; }

/* Date divider */
.bhc-div {
  align-self: center;
  font-size: 10.5px;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
  margin-bottom: 14px;
}
.bhc-div::before,
.bhc-div::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--bhc-border);
}

/* ─────────────────────────────────────────────────────────────────────────────
   MESSAGE ROWS
───────────────────────────────────────────────────────────────────────────── */
.bhc-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 82%;
  animation: bhcIn 0.18s ease both;
}
@keyframes bhcIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.bhc-row.bot  { align-self: flex-start; }
.bhc-row.user { align-self: flex-end; flex-direction: row-reverse; }

/* Tight gap between consecutive same-sender messages */
.bhc-row + .bhc-row.bot,
.bhc-row + .bhc-row.user { margin-top: 2px; }

/* Larger gap when sender changes */
.bhc-row.bot  + .bhc-row.user,
.bhc-row.user + .bhc-row.bot  { margin-top: 12px; }

/* ─────────────────────────────────────────────────────────────────────────────
   AVATARS
───────────────────────────────────────────────────────────────────────────── */
.bhc-av {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  line-height: 0;
  align-self: flex-end;
}
.bhc-row.user .bhc-av {
  background: var(--bhc-green-dk);
  font-size: 9px;
  font-weight: 700;
  color: var(--bhc-white);
  line-height: 1;
  letter-spacing: -0.02em;
}
/* Hide avatar for consecutive same-sender messages, but keep the space */
.bhc-row.hide-av .bhc-av { visibility: hidden; }

/* ─────────────────────────────────────────────────────────────────────────────
   MESSAGE BUBBLES
   NOTE: #bhc-root prefix is required to beat the "#bhc-root * { padding:0 }"
   reset rule — without it, padding: 0 wins.
───────────────────────────────────────────────────────────────────────────── */
#bhc-root .bhc-bub {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: break-word;
  word-break: break-word;
  box-sizing: border-box;
  width: fit-content;
  max-width: 100%;
  flex-shrink: 1;
}

/* Bot bubble */
#bhc-root .bhc-row.bot .bhc-bub {
  background: #eaeef1;
  color: var(--bhc-txt);
  border-radius: 4px var(--bhc-radius-bub) var(--bhc-radius-bub) var(--bhc-radius-bub);
}

/* User bubble */
#bhc-root .bhc-row.user .bhc-bub {
  background: linear-gradient(135deg, var(--bhc-green), var(--bhc-green-dk));
  color: var(--bhc-white);
  border-radius: var(--bhc-radius-bub) 4px var(--bhc-radius-bub) var(--bhc-radius-bub);
}

/* Links inside bubbles */
#bhc-root .bhc-row.bot  .bhc-bub a { color: var(--bhc-green-dk); font-weight: 600; text-decoration: underline; }
#bhc-root .bhc-row.user .bhc-bub a { color: rgba(255,255,255,0.9); text-decoration: underline; }

/* ─────────────────────────────────────────────────────────────────────────────
   TYPING INDICATOR
───────────────────────────────────────────────────────────────────────────── */
.bhc-typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 16px;
}
.bhc-typing span {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  animation: bhcDot 1.2s infinite ease-in-out;
}
.bhc-typing span:nth-child(2) { animation-delay: 0.16s; }
.bhc-typing span:nth-child(3) { animation-delay: 0.32s; }
@keyframes bhcDot {
  0%, 60%, 100% { transform: translateY(0);   opacity: 0.5; }
  30%            { transform: translateY(-5px); opacity: 1;   }
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUGGESTED QUESTION CHIPS
───────────────────────────────────────────────────────────────────────────── */
#bhc-chips {
  flex-shrink: 0;
  padding: 10px 14px 14px;
  background: #f8fafb;
  border-top: 1px solid #e8edf1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

#bhc-chips-lbl {
  width: 100%;
  font-size: 10px;
  font-weight: 700;
  color: #9ca3af;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

/* NOTE: #bhc-root prefix to beat the padding:0 reset */
#bhc-root .bhc-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--bhc-white);
  border: 1.5px solid #d1f5dd;
  color: #1a7a3c;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1;
  outline: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition:
    background    0.14s ease,
    color         0.14s ease,
    border-color  0.14s ease,
    transform     0.1s  ease,
    box-shadow    0.14s ease;
  -webkit-tap-highlight-color: transparent;
}
#bhc-root .bhc-chip:hover {
  background:    var(--bhc-green);
  border-color:  var(--bhc-green);
  color:         var(--bhc-white);
  transform:     translateY(-1px);
  box-shadow:    0 4px 12px rgba(43,197,96,0.3);
}
#bhc-root .bhc-chip:active {
  transform:  scale(0.97);
  box-shadow: none;
}
#bhc-root .bhc-chip:focus-visible {
  outline: 2px solid var(--bhc-green-dk);
  outline-offset: 3px;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ERROR BANNER
───────────────────────────────────────────────────────────────────────────── */
#bhc-err {
  flex-shrink: 0;
  display: none;
  align-items: center;
  gap: 7px;
  margin: 0 12px 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  font-size: 12.5px;
}
#bhc-err.show { display: flex; }

/* ─────────────────────────────────────────────────────────────────────────────
   INPUT AREA
───────────────────────────────────────────────────────────────────────────── */
#bhc-input-wrap {
  flex-shrink: 0;
  padding: 10px 12px 12px;
  background: var(--bhc-white);
  border-top: 1px solid var(--bhc-border-lt);
}

/* Pill container */
#bhc-input-row {
  display: flex;
  align-items: center;
  background: #f8f9fb;
  border: 1.5px solid #dde1e7;
  border-radius: 28px;
  padding: 0 6px 0 16px;
  min-height: 48px;
  gap: 6px;
  transition:
    border-color 0.18s ease,
    box-shadow   0.18s ease,
    background   0.18s ease;
}
#bhc-input-row:focus-within {
  border-color: var(--bhc-green);
  box-shadow:   0 0 0 3.5px rgba(43,197,96,0.14);
  background:   var(--bhc-white);
}

/* Textarea */
#bhc-ta {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  outline: none;
  font-size: 14px;
  font-family: inherit;
  color: var(--bhc-txt);
  line-height: 1.5;
  padding: 12px 0;
  max-height: 88px;
  overflow-y: auto;
}
#bhc-ta::placeholder                { color: #adb5bd; }
#bhc-ta::-webkit-scrollbar          { width: 3px; }
#bhc-ta::-webkit-scrollbar-thumb    { background: #d1d5db; border-radius: 2px; }

/* Send button */
#bhc-send {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--bhc-green), var(--bhc-green-dk));
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    opacity    0.14s ease,
    transform  0.12s ease,
    box-shadow 0.14s ease;
  outline: none;
  line-height: 0;
  box-shadow: 0 2px 6px rgba(43,197,96,0.35);
}
#bhc-send:hover:not(:disabled) {
  transform:  scale(1.1);
  box-shadow: 0 4px 12px rgba(43,197,96,0.45);
}
#bhc-send:active:not(:disabled) {
  transform:  scale(0.93);
  box-shadow: none;
}
#bhc-send:disabled {
  background: #d1d5db;
  box-shadow: none;
  cursor: default;
  opacity: 0.75;
}
#bhc-send:focus-visible {
  outline: 2px solid var(--bhc-green-dk);
  outline-offset: 3px;
}

/* ─────────────────────────────────────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────────────────────────────────────── */
#bhc-footer {
  flex-shrink: 0;
  padding: 6px 16px 9px;
  border-top: 1px solid var(--bhc-border-lt);
  background: var(--bhc-white);
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.7;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}
#bhc-footer a        { color: #6b7280; font-weight: 600; text-decoration: none; }
#bhc-footer a:hover  { color: var(--bhc-green-dk); }
#bhc-footer-tel {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--bhc-red);
  font-weight: 700;
  font-size: 11.5px;
  text-decoration: none;
}
#bhc-footer-tel:hover { text-decoration: underline; }
.bhc-sep { color: #d1d5db; }

/* ─────────────────────────────────────────────────────────────────────────────
   RESPONSIVE — mobile full-screen
───────────────────────────────────────────────────────────────────────────── */
@media (max-width: 420px) {
  #bhc-panel {
    width: calc(100vw - 8px);
    right: 4px;
    bottom: 84px;
    height: calc(100svh - 96px);
    max-height: none;
    border-radius: 16px;
  }
  #bhc-fab {
    right:  16px;
    bottom: 16px;
    width:  54px;
    height: 54px;
  }
}
`;

// ─── Icons ──────────────────────────────────────────────────────────────────
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
const ICON_FAB = `<svg width="24" height="24" viewBox="0 0 32 32"
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
const ICON_FAB_CLOSE = `<svg width="20" height="20" viewBox="0 0 20 20"
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
const ICON_BOT_HEADER = `<svg width="36" height="36" viewBox="0 0 36 36"
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
const ICON_BOT_AVATAR = `<svg width="28" height="28" viewBox="0 0 28 28"
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
const ICON_CLOSE = `<svg width="12" height="12" viewBox="0 0 12 12"
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
const ICON_SEND = `<svg width="18" height="18" viewBox="0 0 24 24"
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
function ICON_PHONE(color = '#EE2B31') {
  return `<svg width="11" height="11" viewBox="0 0 24 24"
    fill="${color}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24
      11.36 11.36 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4
      a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"/>
  </svg>`;
}


// ─── ChatClient ─────────────────────────────────────────────────────────────
/**
 * ChatClient — wraps the BROOK-RAG streaming API.
 *
 * POST /chat/start  →  NDJSON stream of ChatChunk frames:
 *   { timestamp, message, is_final, error }
 *
 * Usage:
 *   const client = new ChatClient({ apiUrl: 'https://your-api.com' });
 *   await client.send('What are your hours?', {
 *     onChunk: (text) => console.log(text),
 *     onDone:  ()     => console.log('done'),
 *     onError: (msg)  => console.error(msg),
 *   });
 */

class ChatClient {
  /**
   * @param {object} options
   * @param {string} options.apiUrl  - Base URL of the BROOK-RAG backend (no trailing slash)
   */
  constructor({ apiUrl }) {
    if (!apiUrl) throw new Error('ChatClient: apiUrl is required');
    this._apiUrl = apiUrl.replace(/\/$/, '');
    this._abortController = null;
  }

  /**
   * Send a query to the backend and stream the response.
   *
   * @param {string} query
   * @param {object} handlers
   * @param {(text: string) => void}  handlers.onChunk  - called for each text delta
   * @param {() => void}              handlers.onDone   - called when the stream finishes cleanly
   * @param {(message: string) => void} handlers.onError - called on network or API errors
   * @returns {Promise<void>}
   */
  async send(query, { onChunk, onDone, onError } = {}) {
    // Cancel any in-flight request before starting a new one.
    this.abort();
    this._abortController = new AbortController();

    let response;
    try {
      response = await fetch(`${this._apiUrl}/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: this._abortController.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') return; // User cancelled — not an error.
      onError && onError('Unable to reach the server. Please check your connection.');
      return;
    }

    if (!response.ok) {
      let detail = `Server error (${response.status})`;
      try {
        const body = await response.json();
        if (body && body.detail) detail = body.detail;
      } catch (_) { /* ignore JSON parse failures */ }
      onError && onError(detail);
      return;
    }

    // Stream NDJSON — one JSON object per line.
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep any partial line for the next iteration

        for (const line of lines) {
          if (!line.trim()) continue;

          let frame;
          try {
            frame = JSON.parse(line);
          } catch (_) {
            // Malformed line — skip it.
            continue;
          }

          if (frame.error) {
            onError && onError(frame.error);
          }

          if (frame.is_final) {
            onDone && onDone();
            return;
          }

          if (frame.message) {
            onChunk && onChunk(frame.message);
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError && onError('The response stream ended unexpectedly.');
      }
    } finally {
      reader.releaseLock();
    }

    // Fallback: stream ended without a final frame.
    onDone && onDone();
  }

  /**
   * Abort the currently in-flight request (if any).
   */
  abort() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  /**
   * Check backend health.
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    try {
      const res = await fetch(`${this._apiUrl}/health`, { method: 'GET' });
      if (!res.ok) return false;
      const body = await res.json();
      return body && body.status === 'ok';
    } catch (_) {
      return false;
    }
  }
}

export { ChatClient };

// ─── ChatWidget ─────────────────────────────────────────────────────────────
/**
 * ChatWidget.js — Brook Hollow Family Dentistry
 * ==============================================
 * Responsibilities:
 *   • Build and manage the chat panel DOM
 *   • Drive all UI state transitions
 *   • Emit lifecycle events the host page can subscribe to
 *   • Delegate all API calls to ChatClient
 *
 * This file contains ZERO inline CSS.
 * Styles live in brook-chat.css (separate file, separate concern).
 * Icons live in icons.js (separate file, separately testable).
 *
 * STATE MACHINE
 * ─────────────
 * The widget has a single source of truth: this._state (a plain object).
 * Every mutation goes through _setState(), which applies the diff, calls
 * _render(), and emits a 'stateChange' event so the host page can react.
 *
 *   idle     → Widget mounted, panel closed, nothing happening.
 *   open     → Panel visible, ready for input.
 *   sending  → API call in flight; input + send button disabled.
 *   error    → Last send failed; error banner visible.
 *
 * PUBLIC STATE SHAPE  (returned by getState())
 * ────────────────────────────────────────────
 *   {
 *     // UI
 *     panelOpen:       boolean,        // is the panel visible?
 *     busy:            boolean,        // is a request in-flight?
 *     badgeVisible:    boolean,        // is the notification dot shown?
 *     error:           string|null,    // last error message, or null
 *
 *     // Conversation
 *     messageCount:    number,         // total messages sent by the user this session
 *     conversationId:  string,         // stable UUID per page-load session
 *     sessionStart:    number,         // Date.now() when the widget was first mounted
 *     lastUserMessage: string|null,    // text of the most-recent user message
 *     lastBotMessage:  string|null,    // full text of the most-recent bot reply
 *   }
 *
 * MESSAGE HISTORY  (returned by getHistory())
 * ────────────────────────────────────────────
 *   Array of { role: 'user'|'bot', text: string, ts: number }
 *   Ordered oldest → newest. Excludes the welcome message.
 *
 * EVENTS
 * ──────
 * Subscribe via  widget.on('open', handler)
 * Unsubscribe via widget.off('open', handler)
 *
 *   'open'        — panel opened
 *   'close'       — panel closed
 *   'send'        — user submitted a message  ({ text })
 *   'response'    — bot reply finished        ({ text })
 *   'error'       — API or network error      ({ message })
 *   'stateChange' — any state mutation        ({ prev: PublicState, next: PublicState })
 *   'destroy'     — widget removed from DOM
 */

/* ─── TYPING DOTS HTML ───────────────────────────────────────────────────── */
const TYPING_HTML = `<span class="bhc-typing" aria-label="Assistant is typing">
  <span></span><span></span><span></span>
</span>`;

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

/** HTML-escape a string — used when injecting user-supplied text into innerHTML */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escape text and then linkify phone numbers and https:// URLs.
 * Safe to inject as innerHTML.
 * @param {string} raw
 * @returns {string}
 */
function linkify(raw) {
  let s = esc(raw);
  // Phone numbers: +1 XXX-XXX-XXXX, (XXX) XXX-XXXX, etc.
  s = s.replace(
    /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g,
    m => `<a href="tel:${m.replace(/[^+\d]/g, '')}">${m}</a>`
  );
  // https:// URLs
  s = s.replace(
    /(https?:\/\/[^\s<>"']+)/g,
    u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`
  );
  return s.replace(/\n/g, '<br>');
}

/* ═══════════════════════════════════════════════════════════════════════════
   ChatWidget
═══════════════════════════════════════════════════════════════════════════ */
export class ChatWidget {
  /**
   * @param {object}       opts
   * @param {import('./ChatClient').ChatClient} opts.client      - API client (required)
   * @param {string}       [opts.title]         - Header title
   * @param {string}       [opts.subtitle]      - Header subtitle / status text
   * @param {string}       [opts.placeholder]   - Textarea placeholder
   * @param {string}       [opts.welcomeMsg]    - First bot message shown on open
   * @param {string[]}     [opts.suggestions]   - Quick-reply chip labels
   * @param {boolean}      [opts.openOnLoad]    - Auto-open panel on mount
   * @param {HTMLElement}  [opts.container]     - Mount target (default: document.body)
   * @param {string}       [opts.cssHref]       - Path/URL to brook-chat.css.
   *                                              Pass this if you're loading the CSS
   *                                              as a <link> tag yourself OR via a
   *                                              bundler import. The widget will then
   *                                              skip injecting the inline <style>.
   *                                              Leave undefined to use auto-inject.
   */
  constructor(opts = {}) {
    // ── Config ──────────────────────────────────────────────────────────────
    this._api     = opts.client;
    this._title   = opts.title       || 'Brook Hollow Dentistry';
    this._sub     = opts.subtitle    || 'AI Dental Assistant · Online';
    this._ph      = opts.placeholder || 'Type a message…';
    this._hello   = opts.welcomeMsg  ||
      "Hi there! 👋 I'm the virtual assistant for Brook Hollow Family Dentistry. " +
      "I can help with hours, services, insurance, and appointments. How can I help you today?";
    this._chips   = opts.suggestions || [
      'What are your hours?',
      'Do you accept my insurance?',
      'How do I book an appointment?',
      'Emergency dental care?',
    ];
    this._mount   = opts.container   || document.body;
    this._cssHref = opts.cssHref     || null;

    // ── Event listeners map ──────────────────────────────────────────────────
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();

    // ── Internal state (single source of truth) ──────────────────────────────
    /**
     * Full internal state — a superset of what getState() exposes publicly.
     * chipsHidden is internal UI plumbing; not exposed on getState().
     *
     * @type {{
     *   panelOpen:       boolean,
     *   busy:            boolean,
     *   badgeVisible:    boolean,
     *   chipsHidden:     boolean,     // internal — not in public state
     *   error:           string|null,
     *   messageCount:    number,
     *   conversationId:  string,
     *   sessionStart:    number,
     *   lastUserMessage: string|null,
     *   lastBotMessage:  string|null,
     * }}
     */
    this._state = {
      panelOpen:       false,
      busy:            false,
      badgeVisible:    false,
      chipsHidden:     false,
      error:           null,
      messageCount:    0,
      conversationId:  _genId(),
      sessionStart:    Date.now(),
      lastUserMessage: null,
      lastBotMessage:  null,
    };

    // ── Message history (excludes welcome message) ────────────────────────────
    /**
     * @type {Array<{ role: 'user'|'bot', text: string, ts: number }>}
     */
    this._history = [];

    // ── Private streaming bookkeeping ─────────────────────────────────────────
    this._streamBubble  = null;  // the DOM element being updated during streaming
    this._lastRole      = null;  // tracks last message sender for avatar grouping

    // ── Build ─────────────────────────────────────────────────────────────────
    this._injectCSS();
    this._buildDOM();
    this._bindEvents();
    if (opts.openOnLoad) this.open();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     EVENT EMITTER
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Subscribe to a widget event.
   *
   * Available events:
   *   'open'        — panel opened
   *   'close'       — panel closed
   *   'send'        — user submitted a message  (payload: { text: string })
   *   'response'    — bot reply finished        (payload: { text: string })
   *   'error'       — API / network error       (payload: { message: string })
   *   'stateChange' — any state mutation        (payload: { prev, next })
   *   'destroy'     — widget removed from DOM
   *
   * @param {string}   event
   * @param {Function} handler
   * @returns {this}   chainable
   *
   * @example
   * widget.on('send', ({ text }) => console.log('User sent:', text));
   * widget.on('stateChange', ({ prev, next }) => {
   *   if (!prev.panelOpen && next.panelOpen) analytics.track('chat_opened');
   * });
   */
  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return this;
  }

  /**
   * Unsubscribe a handler from an event.
   * @param {string}   event
   * @param {Function} handler
   * @returns {this}
   */
  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
    return this;
  }

  /**
   * Subscribe to an event for exactly one invocation, then auto-unsubscribe.
   * @param {string}   event
   * @param {Function} handler
   * @returns {this}
   */
  once(event, handler) {
    const wrapper = (payload) => { handler(payload); this.off(event, wrapper); };
    return this.on(event, wrapper);
  }

  /**
   * Emit an event to all registered handlers.
   * Errors thrown by handlers are caught and logged so one bad handler
   * cannot break the widget.
   * @param {string} event
   * @param {*}      [payload]
   */
  _emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    for (const h of handlers) {
      try { h(payload); } catch (e) {
        console.error(`[BrookChat] Uncaught error in "${event}" handler:`, e);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     STATE MANAGEMENT
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Merge a partial state update, trigger a render pass, and emit 'stateChange'.
   *
   * This is the ONLY way internal state should be mutated.
   * The 'stateChange' event carries PUBLIC state snapshots (chipsHidden stripped),
   * so external listeners only see the documented public shape.
   *
   * @param {Partial<typeof this._state>} patch
   */
  _setState(patch) {
    const prevFull = { ...this._state };
    Object.assign(this._state, patch);
    const nextFull = { ...this._state };
    this._render(prevFull, nextFull);
    // Emit only the public state slice to external listeners
    this._emit('stateChange', {
      prev: _publicState(prevFull),
      next: _publicState(nextFull),
    });
  }

  /**
   * Reconcile the DOM to match state changes.
   * Only touches the DOM elements affected by the changed keys.
   *
   * @param {typeof this._state} prev
   * @param {typeof this._state} next
   */
  _render(prev, next) {
    // ── panelOpen ────────────────────────────────────────────────────────────
    if (prev.panelOpen !== next.panelOpen) {
      if (next.panelOpen) {
        this._panel.classList.add('open');
        this._panel.setAttribute('aria-hidden', 'false');
        this._fab.setAttribute('data-open', 'true');
        this._fab.setAttribute('aria-expanded', 'true');
      } else {
        this._panel.classList.remove('open');
        this._panel.setAttribute('aria-hidden', 'true');
        this._fab.setAttribute('data-open', 'false');
        this._fab.setAttribute('aria-expanded', 'false');
      }
    }

    // ── badgeVisible ─────────────────────────────────────────────────────────
    if (prev.badgeVisible !== next.badgeVisible) {
      this._badge.classList.toggle('show', next.badgeVisible);
    }

    // ── busy (send button + input) ───────────────────────────────────────────
    if (prev.busy !== next.busy) {
      // Send button: disabled when busy OR when textarea is empty
      this._sendBtn.disabled = next.busy || !this._ta.value.trim();
    }

    // ── error ─────────────────────────────────────────────────────────────────
    if (prev.error !== next.error) {
      if (next.error) {
        this._errMsg.textContent = next.error;
        this._errEl.classList.add('show');
        clearTimeout(this._errTimer);
        this._errTimer = setTimeout(() => this._setState({ error: null }), 7000);
      } else {
        this._errEl.classList.remove('show');
      }
    }

    // ── chipsHidden ───────────────────────────────────────────────────────────
    if (prev.chipsHidden !== next.chipsHidden && next.chipsHidden) {
      this._chipsEl.style.display = 'none';
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     CSS INJECTION
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Inject styles. Three strategies (in priority order):
   *
   * 1. If the host page already has <link id="bhc-css"> or <style id="bhc-css">
   *    in the document — do nothing (user manages CSS themselves).
   *
   * 2. If opts.cssHref was provided — inject a <link rel="stylesheet">.
   *    Use this when you're serving brook-chat.css as a static file:
   *      BrookChat.init({ apiUrl, cssHref: '/assets/brook-chat.css' })
   *
   * 3. Otherwise — the build script inlines the CSS as a JS string constant
   *    (BUNDLED_CSS) and we inject it as a <style> tag. This is the default
   *    zero-config mode used by the IIFE bundle (dist/brook-chat.js).
   */
  _injectCSS() {
    if (document.getElementById('bhc-css')) return; // already present

    if (this._cssHref) {
      // Strategy 2 — external file
      const link = document.createElement('link');
      link.id   = 'bhc-css';
      link.rel  = 'stylesheet';
      link.href = this._cssHref;
      document.head.appendChild(link);
    } else if (typeof BUNDLED_CSS === 'string') {
      // Strategy 3 — inlined by build script
      const style = document.createElement('style');
      style.id = 'bhc-css';
      style.textContent = BUNDLED_CSS; // eslint-disable-line no-undef
      document.head.appendChild(style);
    }
    // If neither, the user is expected to load the CSS themselves.
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DOM CONSTRUCTION
  ═══════════════════════════════════════════════════════════════════════════ */

  _buildDOM() {
    const r = document.createElement('div');
    r.id = 'bhc-root';
    r.setAttribute('role', 'region');
    r.setAttribute('aria-label', 'Brook Hollow chat widget');

    r.innerHTML = `
      <!-- ── Floating Action Button ──────────────────────────────────── -->
      <button id="bhc-fab"
        data-open="false"
        aria-label="Open chat assistant"
        aria-expanded="false"
        aria-controls="bhc-panel">
        <span class="fi fi-chat">${ICON_FAB}</span>
        <span class="fi fi-dash">${ICON_FAB_CLOSE}</span>
        <span id="bhc-badge" aria-hidden="true"></span>
      </button>

      <!-- ── Chat Panel ───────────────────────────────────────────────── -->
      <div id="bhc-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Brook Hollow dental assistant"
        aria-hidden="true">

        <!-- Header -->
        <div id="bhc-hdr">
          <div id="bhc-hdr-av" aria-hidden="true">${ICON_BOT_HEADER}</div>
          <div id="bhc-hdr-text">
            <div id="bhc-hdr-name">${esc(this._title)}</div>
            <div id="bhc-hdr-status">
              <span class="bhc-dot" aria-hidden="true"></span>
              <span id="bhc-hdr-sub">${esc(this._sub)}</span>
            </div>
          </div>
          <button id="bhc-hdr-close" aria-label="Close chat">
            ${ICON_CLOSE}
          </button>
        </div>

        <!-- Message log -->
        <div id="bhc-msgs"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          aria-relevant="additions"></div>

        <!-- Suggestion chips -->
        <div id="bhc-chips"
          role="group"
          aria-label="Suggested questions">
          <div id="bhc-chips-lbl">Suggested questions</div>
        </div>

        <!-- Error banner -->
        <div id="bhc-err" role="alert" aria-atomic="true">
          <span aria-hidden="true">⚠️</span>
          <span id="bhc-err-msg"></span>
        </div>

        <!-- Input -->
        <div id="bhc-input-wrap">
          <div id="bhc-input-row">
            <textarea
              id="bhc-ta"
              rows="1"
              aria-label="Type your message"
              placeholder="${esc(this._ph)}"
              autocomplete="off"
              spellcheck="true"></textarea>
            <button id="bhc-send" aria-label="Send message" disabled>
              ${ICON_SEND}
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div id="bhc-footer">
          <span>Powered by
            <a href="https://www.brookhollowfamilydentistry.com"
              target="_blank" rel="noopener">Brook Hollow AI</a>
          </span>
          <span class="bhc-sep">·</span>
          <a href="tel:+12104947681"
            id="bhc-footer-tel"
            aria-label="Call us at +1 210-494-7681">
            ${ICON_PHONE()}&nbsp;+1 210-494-7681
          </a>
        </div>

      </div>`;

    this._mount.appendChild(r);

    // ── Cache DOM references (once, at build time) ─────────────────────────
    this._root      = r;
    this._fab       = r.querySelector('#bhc-fab');
    this._badge     = r.querySelector('#bhc-badge');
    this._panel     = r.querySelector('#bhc-panel');
    this._msgs      = r.querySelector('#bhc-msgs');
    this._chipsEl   = r.querySelector('#bhc-chips');
    this._errEl     = r.querySelector('#bhc-err');
    this._errMsg    = r.querySelector('#bhc-err-msg');
    this._ta        = r.querySelector('#bhc-ta');
    this._sendBtn   = r.querySelector('#bhc-send');
    this._closeBtn  = r.querySelector('#bhc-hdr-close');

    // ── Build suggestion chips ─────────────────────────────────────────────
    this._chips.forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'bhc-chip';
      btn.type      = 'button';
      btn.textContent = label;
      btn.addEventListener('click', () => this._submitQuery(label));
      this._chipsEl.appendChild(btn);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     EVENT BINDING
  ═══════════════════════════════════════════════════════════════════════════ */

  _bindEvents() {
    // FAB / close button
    this._fab.addEventListener('click', () => this.toggle());
    this._closeBtn.addEventListener('click', () => this.close());

    // Send button
    this._sendBtn.addEventListener('click', () => this._submitFromTextarea());

    // Textarea — grow, enable/disable send, Enter-to-send
    this._ta.addEventListener('input', () => {
      this._autoGrow();
      this._sendBtn.disabled = !this._ta.value.trim() || this._state.busy;
    });
    this._ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._submitFromTextarea();
      }
    });

    // Global: Escape closes panel
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this._state.panelOpen) this.close();
    });

    // Global: click outside closes panel
    document.addEventListener('click', e => {
      if (this._state.panelOpen && !this._root.contains(e.target)) this.close();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     INTERNAL HELPERS
  ═══════════════════════════════════════════════════════════════════════════ */

  /** Grow the textarea to match its content, capped at 88px */
  _autoGrow() {
    this._ta.style.height = 'auto';
    this._ta.style.height = Math.min(this._ta.scrollHeight, 88) + 'px';
  }

  /** Smooth-scroll the message area to the bottom */
  _scrollToBottom() {
    this._msgs.scrollTo({ top: this._msgs.scrollHeight, behavior: 'smooth' });
  }

  /**
   * Append a message row (avatar + bubble) to the message log.
   * Consecutive messages from the same sender hide the avatar to group them.
   *
   * @param {'bot'|'user'} role
   * @param {string}       text      - Initial content; empty string = typing indicator
   * @param {boolean}      [typing]  - If true and text is empty, show typing dots
   * @returns {HTMLElement}          - The bubble element (updated by streaming)
   */
  _addMessage(role, text, typing = false) {
    const consecutive = this._lastRole === role;
    this._lastRole = role;

    const row = document.createElement('div');
    row.className = `bhc-row ${role}${consecutive ? ' hide-av' : ''}`;

    // Avatar
    const av = document.createElement('div');
    av.className = 'bhc-av';
    av.setAttribute('aria-hidden', 'true');
    if (role === 'bot') {
      av.innerHTML = ICON_BOT_AVATAR;
    } else {
      av.textContent = 'You';
    }

    // Bubble
    const bub = document.createElement('div');
    bub.className = 'bhc-bub';
    bub.innerHTML = (typing && !text) ? TYPING_HTML : linkify(text);

    row.appendChild(av);
    row.appendChild(bub);
    this._msgs.appendChild(row);
    this._scrollToBottom();
    return bub;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MESSAGE SENDING
  ═══════════════════════════════════════════════════════════════════════════ */

  /** Read the textarea, clear it, and call _submitQuery */
  _submitFromTextarea() {
    const text = this._ta.value.trim();
    if (!text || this._state.busy) return;
    this._ta.value = '';
    this._ta.style.height = 'auto';
    this._submitQuery(text);
  }

  /**
   * Core send flow.
   * 1. Hide chips, clear error
   * 2. Render user bubble
   * 3. Render typing-indicator bot bubble
   * 4. Set busy state
   * 5. Stream response into the bubble
   * 6. Clear busy state, emit events
   *
   * @param {string} text
   */
  async _submitQuery(text) {
    // Transition state
    this._setState({
      chipsHidden:     true,
      error:           null,
      busy:            true,
      messageCount:    this._state.messageCount + 1,
      lastUserMessage: text,
    });
    this._emit('send', { text });

    // Track in history
    this._history.push({ role: 'user', text, ts: Date.now() });

    // Render messages
    this._addMessage('user', text);
    const bubble = this._addMessage('bot', '', true);
    this._streamBubble = bubble;

    let accumulated = '';

    await this._api.send(text, {
      onChunk: chunk => {
        accumulated += chunk;
        bubble.innerHTML = linkify(accumulated);
        this._scrollToBottom();
      },
      onDone: () => {
        const botText = accumulated ||
          "I'm sorry, I didn't receive a response. " +
          'Please try again or call us at +1\u00a0210-494-7681.';
        if (!accumulated) bubble.innerHTML = linkify(botText);

        // Record bot reply in state + history
        this._history.push({ role: 'bot', text: botText, ts: Date.now() });
        this._setState({ lastBotMessage: botText });

        this._emit('response', { text: botText });
        this._finaliseStream();
      },
      onError: errMsg => {
        const errText = 'Something went wrong. Please try again or call us at +1\u00a0210-494-7681.';
        bubble.innerHTML = linkify(errText);

        // Record error reply in history too
        this._history.push({ role: 'bot', text: errText, ts: Date.now() });
        this._setState({ error: errMsg, lastBotMessage: errText });

        this._emit('error', { message: errMsg });
        this._finaliseStream();
      },
    });
  }

  /** Clean up after a stream ends (success or error) */
  _finaliseStream() {
    this._streamBubble = null;
    this._setState({ busy: false });
    // Re-evaluate send button (textarea may have content typed while busy)
    this._sendBtn.disabled = !this._ta.value.trim();
    this._scrollToBottom();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     PUBLIC API
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Open the chat panel.
   * Emits 'open'. No-ops if already open.
   */
  open() {
    if (this._state.panelOpen) return;

    this._setState({ panelOpen: true, badgeVisible: false });

    // Initialise message log on first open
    if (this._msgs.children.length === 0) {
      const divider = document.createElement('div');
      divider.className = 'bhc-div';
      divider.textContent = 'Today';
      this._msgs.appendChild(divider);
      this._addMessage('bot', this._hello);
    }

    // Focus textarea after the open animation finishes
    setTimeout(() => this._ta.focus(), 260);
    this._emit('open');
  }

  /**
   * Close the chat panel.
   * Aborts any in-flight API request. Emits 'close'. No-ops if already closed.
   */
  close() {
    if (!this._state.panelOpen) return;

    this._setState({ panelOpen: false, busy: false });
    this._api.abort();
    this._streamBubble = null;

    // Return focus to the FAB
    this._fab.focus();
    this._emit('close');
  }

  /**
   * Toggle the panel open/closed.
   */
  toggle() {
    this._state.panelOpen ? this.close() : this.open();
  }

  /**
   * Show the red notification badge on the FAB.
   * Useful for proactive greetings or timed prompts.
   * The badge is automatically hidden when the user opens the panel.
   */
  showBadge() {
    this._setState({ badgeVisible: true });
  }

  /**
   * Programmatically send a message as the user.
   * Opens the panel first if it is currently closed.
   * @param {string} text
   */
  sendMessage(text) {
    if (!this._state.panelOpen) this.open();
    // Small delay so the panel animation starts before the message appears
    setTimeout(() => this._submitQuery(text), 280);
  }

  /**
   * Read a snapshot of the current PUBLIC widget state.
   * Returns a frozen copy — do not mutate it.
   *
   * Shape:
   *   panelOpen       {boolean}      — is the panel visible?
   *   busy            {boolean}      — is a request in-flight?
   *   badgeVisible    {boolean}      — is the notification dot showing?
   *   error           {string|null}  — last error message, or null
   *   messageCount    {number}       — user messages sent this session
   *   conversationId  {string}       — stable UUID for this page-load session
   *   sessionStart    {number}       — Date.now() when widget was mounted
   *   lastUserMessage {string|null}  — most-recent user message text
   *   lastBotMessage  {string|null}  — most-recent bot reply text (full, post-stream)
   *
   * @returns {Readonly<object>}
   */
  getState() {
    return Object.freeze(_publicState(this._state));
  }

  /**
   * Return a copy of the full message history for this session.
   * Excludes the welcome message. Ordered oldest → newest.
   *
   * Each entry:
   *   role  {string}  — 'user' | 'bot'
   *   text  {string}  — message content
   *   ts    {number}  — Date.now() timestamp when the message was recorded
   *
   * Useful for:
   *   - Pre-filling a contact/booking form with context
   *   - Sending conversation context to a CRM
   *   - Analytics / session replay
   *
   * @returns {Array<{ role: string, text: string, ts: number }>}
   */
  getHistory() {
    return this._history.map(m => ({ ...m })); // shallow copy of each entry
  }

  /**
   * Check if the backend is reachable.
   * Delegates to ChatClient.isHealthy().
   * @returns {Promise<boolean>}
   */
  isHealthy() {
    return this._api.isHealthy();
  }

  /**
   * Remove the widget from the DOM, abort any pending request,
   * and remove the injected stylesheet.
   * Emits 'destroy'.
   */
  destroy() {
    this._api.abort();
    this._root?.remove();
    document.getElementById('bhc-css')?.remove();
    this._emit('destroy');
    this._listeners.clear();
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODULE-PRIVATE HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate a short random session ID (UUID-v4 lite).
 * Used as a stable conversationId per page-load.
 * @returns {string}  e.g. "a3f2c1d4-9b8e-47a1-b2c3-1f2e3d4a5b6c"
 */
function _genId() {
  // Use crypto.randomUUID when available (all modern browsers + Node 19+),
  // fall back to Math.random for older environments.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Project the full internal state to the public state shape.
 * Strips internal-only fields (chipsHidden) so external code never
 * observes or depends on them.
 *
 * @param {object} s  — full internal _state object
 * @returns {object}  — public state slice
 */
function _publicState(s) {
  return {
    panelOpen:       s.panelOpen,
    busy:            s.busy,
    badgeVisible:    s.badgeVisible,
    error:           s.error,
    messageCount:    s.messageCount,
    conversationId:  s.conversationId,
    sessionStart:    s.sessionStart,
    lastUserMessage: s.lastUserMessage,
    lastBotMessage:  s.lastBotMessage,
  };
}


// ─── Public API ─────────────────────────────────────────────────────────────
export const BrookChat = {
  init(options) {
    if (!options || !options.apiUrl) {
      throw new Error('[BrookChat] apiUrl is required.');
    }
    const client = new ChatClient({ apiUrl: options.apiUrl });
    return new ChatWidget(Object.assign({ client }, options));
  },
  ChatClient,
  ChatWidget,
  version: '1.0.0',
};

export default BrookChat;
