
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";

const SYMBOLOGY = {
  field: "SymbologyInt",

  // One color for each integer: 0 through 9.
  palette: [
    "#e6194b", // 0 - Red
    "#3cb44b", // 1 - Green
    "#ffe119", // 2 - Yellow
    "#4363d8", // 3 - Blue
    "#f58231", // 4 - Orange
    "#911eb4", // 5 - Purple
    "#46f0f0", // 6 - Cyan
    "#f032e6", // 7 - Magenta
    "#bcf60c", // 8 - Lime
    "#a9a9a9", // 9 - Gray
  ],

  outline: {
    color: [255, 255, 255, 0.6],
    width: 0.5,
  },
};

const symbolFor = (color) =>
  new SimpleFillSymbol({
    color,
    outline: SYMBOLOGY.outline,
  });

/**
 * Applies unique-value symbology to a field layer using SymbologyInt.
 * Returns true if the field exists and the renderer is applied.
 * Returns false if the field cannot be found.
 */
export function applyRandomSymbology(layer) {
  // Find the field without regard to capitalization.
  const field = layer.fields?.find(
    (candidate) =>
      candidate.name.toLowerCase() === SYMBOLOGY.field.toLowerCase()
  );

  if (!field) {
    console.warn(
      `Cannot apply symbology: field "${SYMBOLOGY.field}" was not found.`,
      layer.fields?.map((candidate) => candidate.name)
    );

    return false;
  }

  // Ensure the field is included in requested attributes when applicable.
  if (
    layer.outFields &&
    !layer.outFields.includes("*") &&
    !layer.outFields.some(
      (name) => name.toLowerCase() === field.name.toLowerCase()
    )
  ) {
    layer.outFields = [...layer.outFields, field.name];
  }

  // Create one unique symbol for each value from 0 to 9.
  layer.renderer = new UniqueValueRenderer({
    field: field.name,

    defaultSymbol: symbolFor([150, 150, 150, 0.6]),
    defaultLabel: "Other / No value",

    uniqueValueInfos: SYMBOLOGY.palette.map((color, index) => ({
      value: index,
      label: String(index),
      symbol: symbolFor(color),
    })),
  });

  return true;
}
