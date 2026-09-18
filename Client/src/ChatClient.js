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

export class ChatClient {
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
