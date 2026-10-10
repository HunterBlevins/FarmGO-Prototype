import { escapeSqlValue } from "./utils.js";
import { CHOROPLETH_CONFIG as CONFIG } from "./choropleth/choroplethConfig.js";


// ============================================================
// COUNTY FILTERING
// ============================================================
//
// Field layers and the field statistics table are filtered by
// county with an exact match on one column (see
// choroplethConfig.js: countyIdColumn / countyIdAttribute /
// countyIdValue).
//
// These helpers build the SQL for that. The value is quoted only
// if the column is text, so both text and number columns work.
// The layer or table must be loaded (so that `fields` exists).
//

function findColumn(layer, columnName, what) {

  const field = layer.fields.find(
    (f) => f.name.toLowerCase() === columnName.toLowerCase()
  );

  if (!field) {
    throw new Error(
      `The ${what} has no "${columnName}" column. ` +
      `Set it in choroplethConfig.js. ` +
      `Available: ${layer.fields.map((f) => f.name).join(", ")}`
    );
  }

  return field;
}

/** "COLUMN = 'value'" or "COLUMN = 123", depending on the column type. */
export function exactClause(layer, columnName, value, what = "layer") {

  const field = findColumn(layer, columnName, what);

  if (field.type === "string") {
    return `${field.name} = '${escapeSqlValue(value)}'`;
  }

  if (!Number.isFinite(Number(value))) {
    throw new Error(
      `"${field.name}" is numeric but the value "${value}" is not.`
    );
  }

  return `${field.name} = ${Number(value)}`;
}

/** "COUNTY_ID = '221'" for the county chosen in the dropdown (its GEOID). */
export function countyClause(layer, columnName, countyId, what) {

  const value = String(CONFIG.countyIdValue({ countyId }));

  return exactClause(layer, columnName, value, what);
}
