// ============================================================
// SHARED HELPERS
// ============================================================

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

/** Escape a value for safe insertion into HTML. */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Escape a value for use inside a single-quoted SQL literal. */
export function escapeSqlValue(value) {
  return String(value).replaceAll("'", "''");
}

/** Keep a number between min and max. */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * True when a config URL has been filled in.
 * Placeholders in config.js look like "YOUR-TEXAS-...".
 */
export function isConfiguredUrl(url) {
  return typeof url === "string" && url.length > 0 && !url.startsWith("YOUR-");
}

/**
 * Creates a guard for async flows where only the most recent call
 * should be allowed to finish (e.g. rapid dropdown changes).
 *
 *   const guard = createLatestGuard();
 *   const isCurrent = guard.next();
 *   await somethingSlow();
 *   if (!isCurrent()) return;   // a newer call started
 */
export function createLatestGuard() {
  let current = 0;

  return {
    next() {
      const id = ++current;
      return () => id === current;
    },
    cancel() {
      current++;
    },
  };
}
