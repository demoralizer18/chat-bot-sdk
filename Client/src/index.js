/**
 * BrookChat SDK — Public Entry Point
 * ====================================
 * Single surface for the entire SDK. Import this module (ESM) or load the
 * compiled IIFE bundle (dist/brook-chat.js) — both expose the same API.
 *
 * ─── QUICK START ─────────────────────────────────────────────────────────────
 *
 *   // 1. Script tag (zero build step):
 *   <link rel="stylesheet" href="/js/brook-chat.css">
 *   <script src="/js/brook-chat.js"></script>
 *   <script>
 *     const chat = BrookChat.init({ apiUrl: 'https://your-api.com' });
 *   </script>
 *
 *   // 2. ES module import:
 *   import BrookChat from './brook-chat.esm.js';
 *   const chat = BrookChat.init({ apiUrl: 'https://your-api.com' });
 *
 *   // 3. Bundler (Vite/Webpack/Rollup) — CSS is imported separately:
 *   import './brook-chat.css';           // or via css-loader / sass
 *   import BrookChat from 'brook-hollow-chat-sdk/src/index.js';
 *   const chat = BrookChat.init({
 *     apiUrl:  'https://your-api.com',
 *     cssHref: null,          // ← tell the widget CSS is already loaded
 *   });
 *
 * ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
 *
 * Read state at any time:
 *   const s = chat.getState();
 *   // {
 *   //   panelOpen:    boolean,
 *   //   busy:         boolean,
 *   //   badgeVisible: boolean,
 *   //   chipsHidden:  boolean,
 *   //   error:        string | null,
 *   //   messageCount: number,
 *   // }
 *
 * React to state changes:
 *   chat.on('stateChange', ({ prev, next }) => {
 *     if (!prev.busy && next.busy)      showLoadingBar();
 *     if (!prev.panelOpen && next.panelOpen) analytics.track('chat_opened');
 *   });
 *
 * ─── EVENT REFERENCE ─────────────────────────────────────────────────────────
 *
 *   Event          Payload                     When
 *   ─────────────────────────────────────────────────────────────────────────
 *   'open'         —                           Panel becomes visible
 *   'close'        —                           Panel hides
 *   'send'         { text: string }            User submits a message
 *   'response'     { text: string }            Bot reply stream finishes
 *   'error'        { message: string }         API / network failure
 *   'stateChange'  { prev, next }              Any state mutation
 *   'destroy'      —                           Widget removed from DOM
 *
 * ─── PROGRAMMATIC CONTROL ────────────────────────────────────────────────────
 *
 *   chat.open()                // open panel
 *   chat.close()               // close panel
 *   chat.toggle()              // open ↔ close
 *   chat.showBadge()           // show red notification dot on FAB
 *   chat.sendMessage('Hello')  // send a message programmatically
 *   chat.getState()            // read-only state snapshot
 *   chat.on(event, handler)    // subscribe
 *   chat.off(event, handler)   // unsubscribe
 *   chat.once(event, handler)  // one-time subscribe
 *   chat.destroy()             // remove widget + clean up
 */

import { ChatClient } from './ChatClient.js';
import { ChatWidget } from './ChatWidget.js';

export { ChatClient, ChatWidget };

/**
 * @typedef {object} BrookChatOptions
 *
 * Required:
 * @property {string}       apiUrl        Base URL of the BROOK-RAG backend (no trailing slash).
 *                                        Example: 'https://api.brookhollowfamilydentistry.com'
 *
 * Widget text (all optional):
 * @property {string}       [title]       Header title.        Default: 'Brook Hollow Dentistry'
 * @property {string}       [subtitle]    Header subtitle.     Default: 'AI Dental Assistant · Online'
 * @property {string}       [placeholder] Input placeholder.   Default: 'Type a message…'
 * @property {string}       [welcomeMsg]  First bot message.
 * @property {string[]}     [suggestions] Quick-reply chip labels (shown before first message).
 *
 * Behaviour (all optional):
 * @property {boolean}      [openOnLoad]  Auto-open panel on mount.    Default: false
 * @property {HTMLElement}  [container]  DOM node to mount into.       Default: document.body
 *
 * CSS loading (optional):
 * @property {string|null}  [cssHref]    Path to brook-chat.css.
 *                                        - undefined → auto-inject inline <style> (default)
 *                                        - '/path/to/brook-chat.css' → inject <link rel="stylesheet">
 *                                        - null → skip; you loaded CSS yourself (bundler / <link>)
 */

/**
 * The BrookChat namespace — recommended public interface.
 *
 * @example
 * // Minimal (CSS auto-injected, no extra config needed):
 * const chat = BrookChat.init({ apiUrl: 'https://your-api.com' });
 *
 * @example
 * // Full config:
 * const chat = BrookChat.init({
 *   apiUrl:     'https://your-api.com',
 *   title:      'Brook Hollow Dentistry',
 *   subtitle:   'AI Dental Assistant · Online',
 *   placeholder:'Type your question…',
 *   welcomeMsg: 'Hi! How can I help you today?',
 *   suggestions:['What are your hours?', 'Book an appointment'],
 *   openOnLoad: false,
 * });
 *
 * // Subscribe to events:
 * chat.on('send',        ({ text }) => console.log('User asked:', text));
 * chat.on('response',    ({ text }) => console.log('Bot replied:', text));
 * chat.on('stateChange', ({ prev, next }) => {
 *   if (!prev.panelOpen && next.panelOpen)
 *     gtag('event', 'chat_opened');
 * });
 *
 * // Proactive prompt after 8 seconds:
 * setTimeout(() => {
 *   if (!chat.getState().panelOpen) {
 *     chat.showBadge();
 *   }
 * }, 8000);
 */
export const BrookChat = {
  /**
   * Create and mount the chat widget.
   *
   * @param   {BrookChatOptions} options
   * @returns {ChatWidget}        The mounted widget instance — keep it to call
   *                              open/close/on/destroy etc.
   * @throws  {Error}             If `apiUrl` is missing.
   */
  init(options = {}) {
    if (!options.apiUrl) {
      throw new Error(
        '[BrookChat] options.apiUrl is required.\n' +
        'Example: BrookChat.init({ apiUrl: "https://your-api.com" })'
      );
    }

    const client = new ChatClient({ apiUrl: options.apiUrl });
    const widget = new ChatWidget({ client, ...options });

    return widget;
  },

  /** Expose classes for advanced / manual wiring */
  ChatClient,
  ChatWidget,
};

export default BrookChat;
