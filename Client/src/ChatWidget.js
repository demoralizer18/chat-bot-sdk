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

import {
  ICON_FAB,
  ICON_FAB_CLOSE,
  ICON_BOT_HEADER,
  ICON_BOT_AVATAR,
  ICON_CLOSE,
  ICON_SEND,
  ICON_PHONE,
} from './icons.js';

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
