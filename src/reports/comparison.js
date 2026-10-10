import { clamp } from "../utils.js";


// ============================================================
// COMPARISONS ("Change from last: Week | Month | Year | Norm")
// ============================================================
//
// All numbers come from the same statistics table the charts use.
// For every variable:
//
//   Now             the most recent record
//   Last week       the record 7 days before "Now"
//   Last month      the record 1 calendar month before
//   Last year       the record 1 calendar year before
//   Historical norm the average of the records at the same time
//                   of year in every earlier year in the table
//
// A comparison record only counts if it falls close enough to the
// target date (see matchTolerance), so weekly data is never
// passed off as "last month" and monthly data has no "last week".
// When nothing matches, the comparison is null and the UI shows a
// dash.
//

const DAY_MS = 24 * 60 * 60 * 1000;

// Most prior years looked at for the historical norm.
const MAX_NORM_YEARS = 60;

// How big a change fills the colour completely, as a fraction of
// the variable's standard deviation over the whole series.
// Smaller = colours saturate sooner.
export const COLOR_SATURATION_STD = 0.5;

export const COMPARISONS = [
  { id: "week",  tab: "Week",            label: "Last week",       days: 7 },
  { id: "month", tab: "Month",           label: "Last month",      months: 1 },
  { id: "year",  tab: "Year",            label: "Last year",       months: 12 },
  { id: "norm",  tab: "Historical Norm", label: "Historical norm" },
];


// ============================================================
// GROUP RECORDS
// ============================================================
//
// records: [{ START, VALUE, PERIOD, VARIABLE }]
//
// Returns Map< variable -> { records, points } > for ONE period.
// `points` are sorted { time, value } with unusable rows removed
// (a null VALUE must never be treated as 0); `records` are the
// matching originals, for the charts.
//

export function groupRecords(records, period) {

  const groups = new Map();

  for (const record of records) {

    if (record.PERIOD !== period || !record.VARIABLE) {
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

    if (!groups.has(record.VARIABLE)) {
      groups.set(record.VARIABLE, { records: [], points: [] });
    }

    const group = groups.get(record.VARIABLE);

    group.records.push(record);
    group.points.push({ time, value });
  }

  for (const group of groups.values()) {
    group.points.sort((a, b) => a.time - b.time);
  }

  return groups;
}


// ============================================================
// COMPARE ONE SERIES
// ============================================================
//
// Returns null when the series is empty, otherwise
//
//   {
//     nowTime, now,          the latest record
//     base,                  value compared against (or null)
//     baseTime,              its date (null for the norm)
//     samples,               how many records `base` is built from
//     delta,                 now - base (or null)
//     direction,             -1 lower, 0 same / unknown, +1 higher
//     strength,              0 - 1, how big the change is
//   }
//

export function compareSeries(points, comparison) {

  if (points.length === 0) {
    return null;
  }

  const latest = points[points.length - 1];
  const step = medianStep(points);

  let base = null;
  let baseTime = null;
  let samples = 0;

  if (comparison.id === "norm") {

    const norm = historicalNorm(points, latest, step);

    if (norm) {
      base = norm.value;
      samples = norm.samples;
    }

  } else {

    const target =
      comparison.days !== undefined
        ? latest.time - comparison.days * DAY_MS
        : addMonthsUTC(latest.time, -comparison.months);

    const match = nearest(
      points,
      target,
      matchTolerance(step, latest.time - target),
      latest.time
    );

    if (match) {
      base = match.value;
      baseTime = match.time;
      samples = 1;
    }
  }

  const delta = base === null ? null : latest.value - base;

  return {
    nowTime: latest.time,
    now: latest.value,
    base,
    baseTime,
    samples,
    delta,
    direction: delta === null ? 0 : Math.sign(delta),
    strength: changeStrength(delta, points),
  };
}


// ============================================================
// HISTORICAL NORM  (PLACEHOLDER)
// ============================================================
//
// For now the "norm" is worked out from the table itself: the
// average of the records at the same time of year in every earlier
// year the table covers. That is only as good as the years on file.
//
// When the table gets a real historical-norm field, replace the
// body of this function with a lookup of that value for `latest`
// (and return { value, samples: 1 }). Nothing else needs to change:
// the tab, colours, tooltip and "Historical norm" label all read
// from what this returns.
//
// Returns { value, samples } or null when there is nothing to
// compare with.
//

function historicalNorm(points, latest, step) {

  const tolerance = clamp(step / 2, DAY_MS / 2, 15 * DAY_MS);

  const values = [];

  for (let years = 1; years <= MAX_NORM_YEARS; years++) {

    const target = addMonthsUTC(latest.time, -12 * years);

    // Gone back past the start of the data.
    if (target < points[0].time - tolerance) {
      break;
    }

    const match = nearest(points, target, tolerance, latest.time);

    if (match) {
      values.push(match.value);
    }
  }

  return values.length > 0
    ? { value: mean(values), samples: values.length }
    : null;
}


// ============================================================
// HELPERS
// ============================================================

/**
 * How far a record may be from the target date and still count.
 * Half the data's step, but never more than a quarter of the
 * comparison itself (so "last week" can't match a month-old row).
 */
function matchTolerance(step, offset) {

  return Math.min(clamp(step / 2, DAY_MS / 2, 15 * DAY_MS), offset / 4);
}

/** The point closest to `target`, within `tolerance`, before `before`. */
function nearest(points, target, tolerance, before) {

  let best = null;
  let bestDistance = Infinity;

  for (const point of points) {

    if (point.time >= before) {
      break; // sorted: nothing later can qualify
    }

    const distance = Math.abs(point.time - target);

    if (distance <= tolerance && distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }

  return best;
}

/** The usual gap between records (Infinity with fewer than two). */
function medianStep(points) {

  if (points.length < 2) {
    return Infinity;
  }

  const gaps = [];

  for (let i = 1; i < points.length; i++) {

    const gap = points[i].time - points[i - 1].time;

    if (gap > 0) {
      gaps.push(gap);
    }
  }

  if (gaps.length === 0) {
    return Infinity;
  }

  gaps.sort((a, b) => a - b);

  return gaps[Math.floor(gaps.length / 2)];
}

/**
 * 0 - 1: how large the change is compared with how much this
 * variable normally varies. Units drop out, so rainfall in mm and
 * temperature in degrees are coloured on the same footing.
 */
function changeStrength(delta, points) {

  if (delta === null || delta === 0) {
    return 0;
  }

  const spread = standardDeviation(points.map((p) => p.value));

  const full = spread > 0 ? spread * COLOR_SATURATION_STD : Math.abs(delta);

  return clamp(Math.abs(delta) / full, 0, 1);
}

function mean(values) {

  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values) {

  if (values.length < 2) {
    return 0;
  }

  const average = mean(values);

  const variance =
    values.reduce((sum, v) => sum + (v - average) ** 2, 0) /
    (values.length - 1);

  return Math.sqrt(variance);
}

/**
 * Adds calendar months in UTC (dates in the tables are UTC).
 * 31 March minus one month is 28/29 February, not 3 March.
 */
export function addMonthsUTC(time, months) {

  const date = new Date(time);
  const day = date.getUTCDate();

  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);

  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();

  date.setUTCDate(Math.min(day, daysInMonth));

  return date.getTime();
}
