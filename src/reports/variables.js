import { FIELD_REPORT_CONFIG as TABLE } from "../fieldReports/fieldReportConfig.js";


// ============================================================
// VARIABLE LABELS, UNITS, ORDER AND COLOURS
// ============================================================
//
// Shared by the county report, the field report and the field
// visualization. Everything is configured in
// fieldReports/fieldReportConfig.js.
//

/**
 * { label, unit, higherIsBetter } for a raw VARIABLE value.
 * Unknown variables get a readable version of their raw name.
 */
export function describeVariable(raw) {

  const key = String(raw).trim().toLowerCase();

  const info = TABLE.variables[key];

  if (info) {
    return {
      label: info.label,
      unit: info.unit ?? "",
      higherIsBetter: info.higherIsBetter !== false,
    };
  }

  for (const group of TABLE.groups) {

    const series = group.series.find((s) => s.variable === key);

    if (series) {
      return {
        label: `${group.title} (${series.name})`,
        unit: group.unit ?? "",
        higherIsBetter: group.higherIsBetter !== false,
      };
    }
  }

  return { label: prettify(String(raw)), unit: "", higherIsBetter: true };
}

/** Order variables like TABLE.variableOrder, then alphabetically. */
export function sortVariables(names) {

  const order = TABLE.variableOrder ?? [];

  const rank = (name) => {
    const index = order.indexOf(name);
    return index === -1 ? Infinity : index;
  };

  return [...names].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b)
  );
}

/** Line colour for a variable's chart. `index` picks from the palette. */
export function variableColor(name, index = 0) {

  const key = String(name).trim().toLowerCase();

  for (const group of TABLE.groups) {

    const series = group.series.find((s) => s.variable === key);

    if (series?.color) {
      return series.color;
    }
  }

  return (
    TABLE.variables[key]?.color ??
    TABLE.palette[index % TABLE.palette.length]
  );
}

export function periodRank(period) {

  const index = TABLE.preferredPeriods.indexOf(String(period).toLowerCase());

  return index === -1 ? Infinity : index;
}

export function sortPeriods(periods) {

  return [...periods].sort(
    (a, b) => periodRank(a) - periodRank(b) || a.localeCompare(b)
  );
}

export function capitalize(text) {

  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** "mean_temp" -> "Mean Temp" */
export function prettify(name) {

  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
