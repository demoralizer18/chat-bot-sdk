#!/usr/bin/env node
/**
 * Build script — produces:
 *   dist/brook-chat.js      IIFE bundle  (use with <script src>)
 *   dist/brook-chat.esm.js  ESM bundle   (use with import)
 *   dist/brook-chat.css     Standalone CSS (use with <link rel="stylesheet">)
 *
 * No external build tools required. Pure Node.js 18+.
 *
 * Bundling strategy
 * ─────────────────
 * Source files (in order):
 *   src/icons.js       — SVG constants
 *   src/ChatClient.js  — streaming NDJSON client
 *   src/ChatWidget.js  — UI widget class
 *
 * For the IIFE bundle:
 *   1. Read src/brook-chat.css and escape it as a JS string literal.
 *   2. Inject it as `const BUNDLED_CSS = "...";` before ChatWidget.
 *   3. Strip all ES module import/export syntax from every source file.
 *   4. Concatenate and wrap in an IIFE with the BrookChat public API.
 *
 * For the ESM bundle:
 *   1. Preserve export declarations; strip cross-file imports (they're inlined).
 *   2. Inject BUNDLED_CSS the same way.
 *   3. Export BrookChat as named + default.
 *
 * Usage:
 *   node scripts/build.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/* ─── Read source files ────────────────────────────────────────────────────── */
const iconsSrc      = readFileSync(resolve(ROOT, 'src/icons.js'),       'utf8');
const chatClientSrc = readFileSync(resolve(ROOT, 'src/ChatClient.js'),  'utf8');
const chatWidgetSrc = readFileSync(resolve(ROOT, 'src/ChatWidget.js'),  'utf8');
const cssSrc        = readFileSync(resolve(ROOT, 'src/brook-chat.css'), 'utf8');

/* ─── CSS → JS string literal ──────────────────────────────────────────────── */
// Escape backslashes, backticks, and ${...} so the CSS is safe inside a
// JS template-literal string. We use a regular string to avoid any issues.
function cssToJsString(css) {
  return css
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

const BUNDLED_CSS_DECLARATION = `const BUNDLED_CSS = \`${cssToJsString(cssSrc)}\`;`;

/* ─── Strip ES module syntax helpers ──────────────────────────────────────── */

/**
 * Strip all import/export declarations so a file can be inlined into an IIFE.
 *   export class Foo   →  class Foo
 *   export function f  →  function f
 *   export const X     →  const X
 *   export default X   →  X
 *   import { ... } from '...'; → (removed, handles multi-line imports too)
 */
function stripModuleSyntax(src) {
  // Remove multi-line imports: import {\n  X,\n  Y\n} from '...';
  let s = src.replace(/^import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?\s*\n?/gms, '');
  // Remove single-line imports: import X from '...'; or import '...';
  s = s.replace(/^import\s+.*from\s+['"][^'"]+['"];?\s*\n?/gm, '');
  // Remove: export default
  s = s.replace(/^export\s+default\s+/gm, '');
  // Remove: export (class|function|const|let|var|async)
  s = s.replace(/^export\s+/gm, '');
  return s;
}

/**
 * For the ESM bundle: strip only the *local cross-file* imports
 * (icons.js items — they are inlined above ChatWidget).
 * Keep all other export declarations intact.
 */
function stripCrossFileImports(src) {
  // Handle multi-line imports from local files (./ prefix)
  let s = src.replace(/^import\s*\{[^}]*\}\s*from\s*['"]\.\/[^'"]+['"];?\s*\n?/gms, '');
  // Handle single-line local imports
  s = s.replace(/^import\s+.*from\s+['"]\.\/[^'"]+['"];?\s*\n?/gm, '');
  return s;
}

/* ─── Stripped sources ─────────────────────────────────────────────────────── */
const iconsStripped      = stripModuleSyntax(iconsSrc);
const clientStripped     = stripModuleSyntax(chatClientSrc);
const widgetStripped     = stripModuleSyntax(chatWidgetSrc);

/* ─── IIFE Bundle ──────────────────────────────────────────────────────────── */
const iifeBundle = `/*!
 * Brook Hollow Chat SDK v1.0.0
 * https://www.brookhollowfamilydentistry.com
 *
 * Drop-in chat widget for the BROOK-RAG backend.
 * Zero external dependencies.
 *
 * Quick start:
 *   <script src="brook-chat.js"></script>
 *   <script>
 *     BrookChat.init({ apiUrl: 'https://your-api.com' });
 *   </script>
 *
 * © Brook Hollow Family Dentistry — MIT License
 */
(function (global) {
  'use strict';

  // ─── Bundled CSS (auto-injected into <head> as <style id="bhc-css">) ──────
${BUNDLED_CSS_DECLARATION.split('\n').map(l => '  ' + l).join('\n')}

  // ─── Icons ───────────────────────────────────────────────────────────────
${iconsStripped.split('\n').map(l => '  ' + l).join('\n')}

  // ─── ChatClient ──────────────────────────────────────────────────────────
${clientStripped.split('\n').map(l => '  ' + l).join('\n')}

  // ─── ChatWidget ──────────────────────────────────────────────────────────
${widgetStripped.split('\n').map(l => '  ' + l).join('\n')}

  // ─── Public API ──────────────────────────────────────────────────────────
  const BrookChat = {
    /**
     * Initialise the chat widget and attach it to the page.
     *
     * @param {object}      options
     * @param {string}      options.apiUrl        - Base URL of the BROOK-RAG backend (required)
     * @param {string}      [options.title]        - Header title
     * @param {string}      [options.subtitle]     - Header subtitle
     * @param {string}      [options.placeholder]  - Textarea placeholder text
     * @param {string}      [options.welcomeMsg]   - First bot message shown on open
     * @param {string[]}    [options.suggestions]  - Quick-reply chip labels
     * @param {boolean}     [options.openOnLoad]   - Auto-open panel on page load
     * @param {string}      [options.cssHref]      - URL to brook-chat.css (skips inline injection)
     * @param {HTMLElement} [options.container]    - Mount target (default: document.body)
     * @returns {ChatWidget}
     */
    init(options) {
      if (!options || !options.apiUrl) {
        throw new Error(
          '[BrookChat] apiUrl is required. ' +
          'Example: BrookChat.init({ apiUrl: "https://your-api.com" })'
        );
      }
      const client = new ChatClient({ apiUrl: options.apiUrl });
      return new ChatWidget(Object.assign({ client }, options));
    },

    /** Expose classes for advanced / custom integrations */
    ChatClient,
    ChatWidget,
    version: '1.0.0',
  };

  // ─── Module export (CJS / AMD / global) ──────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrookChat;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () { return BrookChat; });
  } else {
    global.BrookChat = BrookChat;
  }

}(typeof window !== 'undefined' ? window : this));
`;

/* ─── ESM Bundle ───────────────────────────────────────────────────────────── */
// For ESM we inline icons (stripped), inline ChatClient (stripped),
// inject BUNDLED_CSS, then include ChatWidget with local imports stripped
// but export declarations kept.
const esmBundle = `/*!
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
${BUNDLED_CSS_DECLARATION}

// ─── Icons ──────────────────────────────────────────────────────────────────
${iconsStripped}

// ─── ChatClient ─────────────────────────────────────────────────────────────
${stripModuleSyntax(chatClientSrc)}
export { ChatClient };

// ─── ChatWidget ─────────────────────────────────────────────────────────────
${stripCrossFileImports(chatWidgetSrc).replace(/^export\s+class\s/m, 'export class ')}

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
`;

/* ─── Write output ─────────────────────────────────────────────────────────── */
mkdirSync(resolve(ROOT, 'dist'), { recursive: true });

writeFileSync(resolve(ROOT, 'dist/brook-chat.js'),     iifeBundle, 'utf8');
writeFileSync(resolve(ROOT, 'dist/brook-chat.esm.js'), esmBundle,  'utf8');
writeFileSync(resolve(ROOT, 'dist/brook-chat.css'),    cssSrc,     'utf8');

const iifeKB = (Buffer.byteLength(iifeBundle, 'utf8') / 1024).toFixed(1);
const esmKB  = (Buffer.byteLength(esmBundle,  'utf8') / 1024).toFixed(1);
const cssKB  = (Buffer.byteLength(cssSrc,     'utf8') / 1024).toFixed(1);

console.log('');
console.log('  Brook Hollow Chat SDK — build complete');
console.log('  ───────────────────────────────────────');
console.log(`  ✅  dist/brook-chat.js      ${iifeKB.padStart(6)} KB  IIFE  — <script src="brook-chat.js">`);
console.log(`  ✅  dist/brook-chat.esm.js  ${esmKB.padStart(6)} KB  ESM   — import BrookChat from './brook-chat.esm.js'`);
console.log(`  ✅  dist/brook-chat.css     ${cssKB.padStart(6)} KB  CSS   — <link rel="stylesheet" href="brook-chat.css">`);
console.log('');
console.log('  Integration (simplest):');
console.log('    <script src="brook-chat.js"></script>');
console.log('    <script>BrookChat.init({ apiUrl: "http://localhost:8000" });</script>');
console.log('');
