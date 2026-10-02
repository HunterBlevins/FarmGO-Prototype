import { createMap } from "./map.js";

import { appState } from "./state.js";

import {
  initializeUI,
} from "./ui.js";

import {
  initializeGeography,
  selectState,
  selectCounty,
} from "./geography.js";

import {
  setActiveRaster,
  setRasterOpacity,
} from "./rasters.js";

import {
  setActiveFieldLayer,
  setActiveFieldOpacity,
  initializeFieldClick,
  clearFieldSelection,
} from "./fields.js";

import "./style.css";


// ============================================================
// RIGHT PANEL RESIZING
// ============================================================

function initializeRightPanelResize() {

  const rightPanel =
    document.getElementById(
      "rightPanel"
    );

  const resizeHandle =
    document.getElementById(
      "rightResizeHandle"
    );


  // ----------------------------------------------------------
  // MAKE SURE BOTH ELEMENTS EXIST
  // ----------------------------------------------------------

  if (
    !rightPanel ||
    !resizeHandle
  ) {

    console.warn(
      "Right panel resize elements not found."
    );

    return;

  }


  let isResizing = false;


  // ----------------------------------------------------------
  // START RESIZING
  // ----------------------------------------------------------

  resizeHandle.addEventListener(
    "mousedown",
    (event) => {

      event.preventDefault();

      isResizing = true;

      document.body.classList.add(
        "resizing"
      );

    }
  );


  // ----------------------------------------------------------
  // RESIZE WHILE DRAGGING
  // ----------------------------------------------------------

  document.addEventListener(
    "mousemove",
    (event) => {

      if (!isResizing) {

        return;

      }


      const windowWidth =
        window.innerWidth;


      const mouseX =
        event.clientX;


      // ------------------------------------------------------
      // CALCULATE NEW WIDTH
      //
      // The right panel begins at mouseX and extends to the
      // right edge of the browser.
      // ------------------------------------------------------

      const newWidth =
        windowWidth - mouseX;


      // ------------------------------------------------------
      // LIMITS
      // ------------------------------------------------------

      const minWidth =
        280;

      const maxWidth =
        Math.min(
          windowWidth * 0.55,
          800
        );


      const clampedWidth =
        Math.max(
          minWidth,
          Math.min(
            newWidth,
            maxWidth
          )
        );


      // ------------------------------------------------------
      // APPLY WIDTH
      // ------------------------------------------------------

      rightPanel.style.width =
        `${clampedWidth}px`;

    }
  );


  // ----------------------------------------------------------
  // STOP RESIZING
  // ----------------------------------------------------------

  document.addEventListener(
    "mouseup",
    () => {

      if (!isResizing) {

        return;

      }


      isResizing = false;

      document.body.classList.remove(
        "resizing"
      );

    }
  );


  // ----------------------------------------------------------
  // PREVENT TEXT SELECTION WHILE DRAGGING
  // ----------------------------------------------------------

  resizeHandle.addEventListener(
    "dragstart",
    (event) => {

      event.preventDefault();

    }
  );


  console.log(
    "Right panel resizing initialized."
  );

}


// ============================================================
// APPLICATION STARTUP
// ============================================================

async function main() {

  // ----------------------------------------------------------
  // CREATE MAP
  // ----------------------------------------------------------

  const {
    map,
    view,
  } = createMap();


  appState.map =
    map;

  appState.view =
    view;


  // ----------------------------------------------------------
  // INITIALIZE UI
  // ----------------------------------------------------------

  initializeUI({

    onStateChange:
      selectState,

    onCountyChange:
      selectCounty,

    onRasterChange:
      setActiveRaster,

    onRasterOpacityChange:
      setRasterOpacity,

    onFieldLayerChange:
      setActiveFieldLayer,

    onFieldOpacityChange:
      setActiveFieldOpacity,

    onClearFieldSelection:
      clearFieldSelection,

  });


  // ----------------------------------------------------------
  // FIELD CLICK HANDLING
  // ----------------------------------------------------------

  initializeFieldClick();


  // ----------------------------------------------------------
  // RIGHT PANEL RESIZE
  // ----------------------------------------------------------

  initializeRightPanelResize();


  // ----------------------------------------------------------
  // INITIALIZE GEOGRAPHY
  // ----------------------------------------------------------

  try {

    await initializeGeography();

  } catch (error) {

    console.error(
      "Geography initialization failed:",
      error
    );

  }


  // ----------------------------------------------------------
  // APPLICATION READY
  // ----------------------------------------------------------

  console.log(
    "Fields Faster initialized."
  );

}


// ============================================================
// START APPLICATION
// ============================================================

main().catch(
  (error) => {

    console.error(
      "Fields Faster failed to initialize:",
      error
    );

  }
);