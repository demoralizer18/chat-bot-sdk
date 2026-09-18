# Brook Hollow Chat Widget SDK

A zero-dependency, drop-in chat widget that connects to the **BROOK-RAG** streaming backend for Brook Hollow Family Dentistry.

---

## Table of contents

- [Quick start](#quick-start)
- [Installation options](#installation-options)
  - [Option A — Single `<script>` tag (simplest)](#option-a--single-script-tag-simplest)
  - [Option B — Script + external CSS](#option-b--script--external-css)
  - [Option C — ESM / bundler](#option-c--esm--bundler)
- [Configuration reference](#configuration-reference)
- [Programmatic API](#programmatic-api)
- [Event system](#event-system)
- [State shape](#state-shape)
- [CSS theming](#css-theming)
- [Hosted deployment (CDN via GitHub Pages)](#hosted-deployment-cdn-via-github-pages)
- [Building from source](#building-from-source)
- [File structure](#file-structure)
- [Backend requirements](#backend-requirements)

---

## Quick start

Copy `dist/brook-chat.js` next to your HTML file, then add two lines:

```html
<script src="brook-chat.js"></script>
<script>
  BrookChat.init({ apiUrl: 'http://localhost:8000' });
</script>
```

That is all. The widget mounts itself, injects its CSS, and is ready for visitors.

---

## Installation options

### Option A — Single `<script>` tag (simplest)

The IIFE bundle (`dist/brook-chat.js`) contains the CSS baked in. Nothing else needed.

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Dental Site</title>
  </head>
  <body>
    <!-- your page content -->

    <!-- Chat widget — one file, zero config beyond apiUrl -->
    <script src="path/to/brook-chat.js"></script>
    <script>
      BrookChat.init({
        apiUrl: 'https://api.yoursite.com',
      });
    </script>
  </body>
</html>
```

### Option B — Script + external CSS

Load the CSS separately (better caching, avoids FOUC on slow connections):

```html
<head>
  <link rel="stylesheet" href="path/to/brook-chat.css">
</head>
<body>
  <!-- page content -->
  <script src="path/to/brook-chat.js"></script>
  <script>
    BrookChat.init({
      apiUrl: 'https://api.yoursite.com',
      cssHref: 'path/to/brook-chat.css', // tells widget to skip inline injection
    });
  </script>
</body>
```

### Option C — ESM / bundler

```js
import BrookChat from './path/to/brook-chat.esm.js';
// or with a bundler pointing at the src files:
// import BrookChat from './src/index.js';

const widget = BrookChat.init({
  apiUrl: 'https://api.yoursite.com',
});
```

---

## Configuration reference

All options are passed to `BrookChat.init(options)`.

| Option | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | `string` | **required** | Base URL of the BROOK-RAG backend (e.g. `http://localhost:8000`) |
| `title` | `string` | `"Brook Hollow"` | Chat panel header title |
| `subtitle` | `string` | `"Family Dentistry"` | Chat panel header subtitle |
| `placeholder` | `string` | `"Ask me anything…"` | Textarea placeholder text |
| `welcomeMsg` | `string` | Dentistry greeting | First message shown when the panel opens |
| `suggestions` | `string[]` | 4 default chips | Quick-reply chip labels shown below the welcome message |
| `openOnLoad` | `boolean` | `false` | Auto-open the chat panel on page load |
| `cssHref` | `string` | `undefined` | URL to `brook-chat.css`. Provide this when you load CSS via `<link>` yourself — the widget will then skip injecting the inline `<style>` tag |
| `container` | `HTMLElement` | `document.body` | DOM node to mount the widget into |

### Full example

```js
const widget = BrookChat.init({
  apiUrl:      'https://api.brookhollowfamilydentistry.com',
  title:       'Brook Hollow',
  subtitle:    'Family Dentistry',
  placeholder: 'Ask me anything about our services…',
  welcomeMsg:  'Hi! I\'m Brook, your virtual dental assistant. How can I help you today?',
  suggestions: [
    'What services do you offer?',
    'How do I book an appointment?',
    'Do you accept my insurance?',
    'What are your office hours?',
  ],
  openOnLoad: false,
  container:  document.getElementById('chat-mount'),
});
```

---

## Programmatic API

`BrookChat.init()` returns a `ChatWidget` instance with the following methods:

```js
const widget = BrookChat.init({ apiUrl: '...' });

// Open / close / toggle the panel
widget.open();
widget.close();
widget.toggle();

// Show the notification badge on the FAB
widget.showBadge();

// Programmatically send a message as the user
widget.sendMessage('Do you offer teeth whitening?');

// Read current state (returns a frozen snapshot)
const state = widget.getState();
// → { panelOpen, busy, badgeVisible, chipsHidden, error, messageCount }

// Remove the widget from the DOM and clean up all listeners
widget.destroy();
```

---

## Event system

Subscribe with `widget.on(event, handler)`, unsubscribe with `widget.off(event, handler)`.

```js
const widget = BrookChat.init({ apiUrl: '...' });

// Panel lifecycle
widget.on('open',  ()            => console.log('panel opened'));
widget.on('close', ()            => console.log('panel closed'));

// Message lifecycle
widget.on('send',     ({ text }) => console.log('user sent:', text));
widget.on('response', ({ text }) => console.log('bot replied:', text));

// Errors
widget.on('error', ({ message }) => console.error('chat error:', message));

// State changes — fires on every _setState() call
widget.on('stateChange', ({ prev, next }) => {
  if (!prev.panelOpen && next.panelOpen) {
    // panel just opened — fire analytics
    analytics.track('chat_opened');
  }
});

// Widget removed
widget.on('destroy', () => console.log('widget destroyed'));

// One-time listener
widget.once('open', () => {
  // fires only on the very first open
  analytics.track('chat_first_open');
});

// Remove a listener
const handler = ({ text }) => console.log(text);
widget.on('send', handler);
widget.off('send', handler);
```

### All events

| Event | Payload | When |
|---|---|---|
| `open` | `undefined` | Panel became visible |
| `close` | `undefined` | Panel hidden |
| `send` | `{ text: string }` | User submitted a message |
| `response` | `{ text: string }` | Bot finished streaming a reply |
| `error` | `{ message: string }` | API or network error |
| `stateChange` | `{ prev: State, next: State }` | Any state mutation |
| `destroy` | `undefined` | Widget removed from DOM |

---

## State shape

`widget.getState()` returns a plain frozen object:

```ts
{
  panelOpen:    boolean,   // is the chat panel visible?
  busy:         boolean,   // is an API request in-flight?
  badgeVisible: boolean,   // is the red notification dot on the FAB?
  chipsHidden:  boolean,   // have suggestion chips been dismissed?
  error:        string | null, // last error message, or null
  messageCount: number,    // total messages sent by the user this session
}
```

---

## CSS theming

The widget is styled with CSS custom properties. Override them before the widget mounts (or in your own stylesheet) to match your brand:

```css
#bhc-root {
  --bhc-green:    #2bc560;   /* FAB, send button, header gradient */
  --bhc-green-dk: #24a34a;   /* hover states, links */
  --bhc-red:      #EE2B31;   /* phone icon, error accent */
  --bhc-radius:   18px;      /* panel corner radius */
  --bhc-z:        9999;      /* z-index for FAB + panel */
  --bhc-font:     'Inter', 'Lato', system-ui, sans-serif;
}
```

All selectors are scoped under `#bhc-root` so there are no conflicts with your existing styles.

---

## Hosted deployment (CDN via GitHub Pages)

The repo ships a GitHub Actions workflow (`.github/workflows/deploy-sdk.yml`) that automatically builds and publishes `dist/` to **GitHub Pages** on every push to `main`. Once set up, users embed the SDK with a `<script>` tag pointing to the hosted URL — **no file to copy or host yourself**.

### One-time GitHub setup

1. Push this repository to GitHub (if not already there).
2. Go to **Settings → Pages** in your repo.
3. Under **Source**, select **GitHub Actions**.
4. That's it — the next push to `main` triggers the workflow and publishes the files.

### Embed URL pattern

After the first deploy, your files are live at:

```
https://<your-github-username>.github.io/<repo-name>/brook-chat.js
https://<your-github-username>.github.io/<repo-name>/brook-chat.esm.js
https://<your-github-username>.github.io/<repo-name>/brook-chat.css
```

### How anyone embeds it (no file download needed)

```html
<script src="https://<your-github-username>.github.io/<repo-name>/brook-chat.js"></script>
<script>
  BrookChat.init({ apiUrl: 'https://api.yoursite.com' });
</script>
```

### Triggering a redeploy

Deployments happen automatically on every push to `main` that touches `Client/src/**`, `Client/scripts/build.js`, or `Client/package.json`. You can also trigger one manually from the **Actions** tab in GitHub → **Deploy SDK to GitHub Pages** → **Run workflow**.

Or locally:

```bash
cd Client
npm run deploy   # rebuilds dist/, then reminds you to push
git add dist/ && git commit -m "chore: rebuild sdk" && git push
```

---

## Building from source

Requirements: **Node.js 18+** (no npm packages needed).

```bash
# Install nothing — the build uses only Node's built-in `fs` and `path` modules
node scripts/build.js
```

Outputs:

| File | Format | Use for |
|---|---|---|
| `dist/brook-chat.js` | IIFE (self-contained) | `<script src>` — CSS is baked in |
| `dist/brook-chat.esm.js` | ESM | `import` / bundlers |
| `dist/brook-chat.css` | Plain CSS | `<link rel="stylesheet">` |

---

## File structure

```
Client/
├── src/
│   ├── brook-chat.css   — All widget styles (CSS custom properties, scoped to #bhc-root)
│   ├── icons.js         — SVG icon constants (explicit fill/stroke, no currentColor)
│   ├── ChatClient.js    — Streaming NDJSON client (POST /chat/start)
│   ├── ChatWidget.js    — DOM builder, state machine, EventEmitter
│   └── index.js         — Public entry point + JSDoc
├── dist/                — Built output (committed for easy drop-in use)
│   ├── brook-chat.js    — IIFE bundle (CSS inlined)
│   ├── brook-chat.esm.js— ESM bundle
│   └── brook-chat.css   — Standalone CSS
├── examples/
│   ├── basic.html       — Minimal 3-line integration
│   └── full-options.html— Full config + programmatic control demo
├── scripts/
│   └── build.js         — Pure Node.js build script (no dependencies)
└── package.json
```

---

## Backend requirements

The widget connects to the **BROOK-RAG** FastAPI backend. It must be running and reachable at the `apiUrl` you pass to `BrookChat.init()`.

### Endpoints used

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check (tested by `ChatClient.isHealthy()`) |
| `POST` | `/chat/start` | Start a streaming chat session |

### POST /chat/start

**Request body:**
```json
{ "query": "What services do you offer?" }
```

**Response:** `Content-Type: application/x-ndjson`  
A stream of newline-delimited JSON frames:

```json
{"timestamp": 1234567890, "message": "We offer ", "is_final": false, "error": null}
{"timestamp": 1234567891, "message": "general dentistry", "is_final": false, "error": null}
{"timestamp": 1234567892, "message": "", "is_final": true, "error": null}
```

### CORS

If the widget is served from a different origin than the backend, add CORS middleware to the FastAPI app:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.brookhollowfamilydentistry.com"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
```

---

*© Brook Hollow Family Dentistry — MIT License*
