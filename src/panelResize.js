import { clamp } from "./utils.js";

// ============================================================
// RESIZABLE SIDE PANELS
// ============================================================
//
// One implementation shared by the left and right panels.
// Uses pointer events (mouse, touch and pen) and supports the
// keyboard (focus the handle, then use the arrow keys).
// The chosen width is remembered between visits.
//

const KEYBOARD_STEP = 20;

function readSavedWidth(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function saveWidth(key, width) {
  try {
    localStorage.setItem(key, String(Math.round(width)));
  } catch {
    // Storage can be unavailable (private mode); resizing still works.
  }
}

/**
 * @param {object}  options
 * @param {string}  options.panelId   id of the panel element
 * @param {string}  options.handleId  id of the drag handle element
 * @param {"left"|"right"} options.side  which side of the window the panel is on
 * @param {number}  options.minWidth  smallest width in px
 * @param {number}  options.maxWidth  largest width in px
 * @param {number}  options.maxFraction  largest width as a fraction of the window
 */
export function makePanelResizable({
  panelId,
  handleId,
  side,
  minWidth,
  maxWidth,
  maxFraction,
}) {
  const panel = document.getElementById(panelId);
  const handle = document.getElementById(handleId);

  if (!panel || !handle) {
    console.warn(`Resize elements not found: ${panelId} / ${handleId}`);
    return;
  }

  const storageKey = `farmgo:${panelId}:width`;

  const limit = () => Math.min(maxWidth, window.innerWidth * maxFraction);

  const applyWidth = (width) => {
    const clamped = clamp(width, minWidth, limit());
    panel.style.width = `${clamped}px`;
    handle.setAttribute("aria-valuenow", String(Math.round(clamped)));
    return clamped;
  };

  // Accessibility metadata
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("aria-label", `Resize ${side} panel`);
  handle.setAttribute("aria-valuemin", String(minWidth));
  handle.setAttribute("aria-valuemax", String(Math.round(limit())));
  handle.tabIndex = 0;

  // Restore the previous width
  const saved = readSavedWidth(storageKey);
  if (saved) {
    applyWidth(saved);
  }

  // Keep the panel inside its limits when the window shrinks
  window.addEventListener("resize", () => {
    handle.setAttribute("aria-valuemax", String(Math.round(limit())));
    if (panel.style.width) {
      applyWidth(panel.getBoundingClientRect().width);
    }
  });

  // ----------------------------------------------------------
  // POINTER DRAGGING
  // ----------------------------------------------------------

  let dragging = false;

  const widthForPointer = (clientX) =>
    side === "left" ? clientX : window.innerWidth - clientX;

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    dragging = true;
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing");
  });

  handle.addEventListener("pointermove", (event) => {
    if (dragging) {
      applyWidth(widthForPointer(event.clientX));
    }
  });

  const stopDragging = () => {
    if (!dragging) {
      return;
    }
    dragging = false;
    document.body.classList.remove("resizing");
    saveWidth(storageKey, panel.getBoundingClientRect().width);
  };

  handle.addEventListener("pointerup", stopDragging);
  handle.addEventListener("pointercancel", stopDragging);

  // ----------------------------------------------------------
  // KEYBOARD
  // ----------------------------------------------------------

  handle.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();

    // Moving the handle toward the map makes the panel wider.
    const towardMap = side === "left" ? "ArrowRight" : "ArrowLeft";
    const delta = event.key === towardMap ? KEYBOARD_STEP : -KEYBOARD_STEP;

    const width = applyWidth(panel.getBoundingClientRect().width + delta);
    saveWidth(storageKey, width);
  });
}
