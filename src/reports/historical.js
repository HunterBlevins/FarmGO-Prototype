import { FIELD_REPORT_CONFIG as CONFIG } from "../fieldReports/fieldReportConfig.js";


// ============================================================
// HISTORICAL AVERAGES
// ============================================================
//
// The statistics tables (field and county) hold two kinds of rows:
//
//   current      PERIOD = "monthly", "weekly", ...
//   historical   PERIOD = "historical monthly", "historical weekly", ...
//
// A historical row describes what is normal for that time of year.
// These helpers tell the two apart and line the historical rows up
// with the dates of a current series, so a chart can draw the
// historical average and the choropleth can measure the change
// from it.
//
// Rows are matched by their "season": the month of the year for
// monthly data, the week of the year for weekly data, and so on.
// If the table holds several rows per season (one per year, say),
// they are averaged.
//

/** Trimmed, lower-case, single spaces: "Historical_Monthly" -> "historical monthly". */
export function normalizePeriod(period) {

  return String(period ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

/** "monthly" -> "historical monthly" (the name the table uses). */
export function historicalPeriodOf(period) {

  return `${CONFIG.historicalPrefix} ${normalizePeriod(period)}`;
}

export function isHistoricalPeriod(period) {

  return normalizePeriod(period).startsWith(`${CONFIG.historicalPrefix} `);
}

/** "historical monthly" -> "monthly" (current periods come back unchanged). */
export function currentPeriodOf(period) {

  const normal = normalizePeriod(period);
  const prefix = `${CONFIG.historicalPrefix} `;

  return normal.startsWith(prefix) ? normal.slice(prefix.length) : normal;
}

/** Splits records into { current, historical }. */
export function splitRecords(records = []) {

  const current = [];
  const historical = [];

  for (const record of records) {
    (isHistoricalPeriod(record.PERIOD) ? historical : current).push(record);
  }

  return { current, historical };
}


// ============================================================
// SEASONS
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;

/** The UTC month (1 - 12) of a time in milliseconds. */
export function monthOf(time) {

  return new Date(time).getUTCMonth() + 1;
}

/**
 * Which recurring slot of the year a time falls in, for one period.
 * Two rows with the same key are "the same time of year".
 */
export function seasonKey(period, time) {

  const date = new Date(time);

  switch (currentPeriodOf(period)) {

    case "monthly":
      return `m${date.getUTCMonth()}`;

    case "weekly": {
      const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
      const dayOfYear = Math.floor((time - startOfYear) / DAY_MS);
      return `w${Math.min(51, Math.floor(dayOfYear / 7))}`;
    }

    case "daily":
      return `d${date.getUTCMonth()}-${date.getUTCDate()}`;

    // Annual and anything else: one value for the whole record.
    default:
      return "all";
  }
}


// ============================================================
// HISTORICAL SERIES FOR A CHART
// ============================================================
//
// historicalRecords: the historical rows of ONE table
//                    ({ START, VALUE, PERIOD, VARIABLE }).
// points:            the current series, [{ time, value }].
//
// Returns [{ START, VALUE, SAMPLES }]: the historical average at
// each date of the current series (dates with no matching season
// are left out). SAMPLES is how many historical rows were averaged.
//

export function buildHistoricalSeries(historicalRecords, variable, period, points) {

  const wanted = normalizePeriod(period);

  const seasons = new Map(); // key -> { sum, count }

  for (const record of historicalRecords) {

    if (record.VARIABLE !== variable || currentPeriodOf(record.PERIOD) !== wanted) {
      continue;
    }

    const time = new Date(record.START).getTime();

    const value =
      record.VALUE === null || record.VALUE === undefined || record.VALUE === ""
        ? NaN
        : Number(record.VALUE);

    if (!Number.isFinite(time) || !Number.isFinite(value)) {
      continue;
    }

    const key = seasonKey(wanted, time);
    const season = seasons.get(key) ?? { sum: 0, count: 0 };

    season.sum += value;
    season.count += 1;

    seasons.set(key, season);
  }

  const series = [];

  for (const point of points) {

    const season = seasons.get(seasonKey(wanted, point.time));

    if (season) {
      series.push({
        START: point.time,
        VALUE: season.sum / season.count,
        SAMPLES: season.count,
      });
    }
  }

  return series;
}
