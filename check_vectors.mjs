#!/usr/bin/env node
// Run every vector in deepseek-peak-offpeak-vectors.json against a reference
// implementation of DeepSeek's peak/off-peak rule.
//
//     node check_vectors.mjs
//
// No dependencies, no build step, Node 16+. Exit code 0 when every vector
// passes. This is the same program as check_vectors.py; it exists because the
// projects that get this rule wrong are written in JavaScript and TypeScript,
// and a reference implementation you cannot run is not a reference.
//
// The implementation below is deliberately boring. The vectors, not this file,
// are the artifact.

import { readFileSync } from "node:fs";

const HOUR_MS = 3600000;
const DAY_MS = 86400000;

const parse = (instant) => Date.parse(instant);
const hhmm = (text) => {
  const [h, m] = text.split(":");
  return Number(h) * 60 + Number(m);
};

/**
 * The ISO weekday numbers (1 = Monday) the peak windows run on at all.
 * Required, not defaulted. A schedule that omits this field is a schedule with
 * no weekday axis, and filling in Monday-to-Friday on its behalf is exactly
 * the guess that puts the rule back inside the code -- where seven of nine
 * measured projects keep it, and where nobody can correct it.
 */
export function peakWeekdays(schedule) {
  if (!schedule.peak_weekdays || schedule.peak_weekdays.length === 0) {
    throw new Error("schedule has no peak_weekdays; this rule has a weekday "
      + "axis, so a schedule without one cannot be evaluated");
  }
  return new Set(schedule.peak_weekdays);
}

/** 'peak' or 'offpeak' for a UTC instant under a schedule. */
export function phaseAt(whenMs, schedule) {
  const shifted = whenMs + schedule.calendar_utc_offset_hours * HOUR_MS;
  const effective = parse(schedule.weekend_offpeak_effective_utc);

  // Two separate things, both load-bearing. WHICH days are peak days comes
  // from the schedule, not from this file. WHICH CALENDAR the day is counted
  // on is the SHIFTED instant: reading it off `whenMs` -- which is what
  // `new Date(ms).getUTCDay()` gives you -- is the whole bug, because the two
  // calendars disagree over 16:00-24:00 UTC and no vector against the live
  // schedule can tell the difference.
  const weekday = ((Math.floor(shifted / DAY_MS) + 3) % 7) + 1; // 1 = Monday
  if (whenMs >= effective && !peakWeekdays(schedule).has(weekday)) {
    return "offpeak";
  }

  const d = new Date(whenMs);
  const minuteOfDay = d.getUTCHours() * 60 + d.getUTCMinutes();
  for (const [start, end] of schedule.peak_windows_utc) {
    if (hhmm(start) <= minuteOfDay && minuteOfDay < hhmm(end)) return "peak";
  }
  return "offpeak";
}

/** The next instant the phase changes, and the phase that begins there. */
export function nextChange(whenMs, schedule) {
  const now = phaseAt(whenMs, schedule);
  // Candidates: every window edge, plus local midnight (the calendar-day
  // boundary), for the next nine days. Nine covers any weekend plus margin.
  const edges = new Set();
  for (const window of schedule.peak_windows_utc) {
    for (const edge of window) edges.add(hhmm(edge));
  }
  edges.add((((24 - schedule.calendar_utc_offset_hours) % 24) + 24) % 24 * 60);
  const sorted = [...edges].sort((a, b) => a - b);
  const day = Math.floor(whenMs / DAY_MS) * DAY_MS;
  for (let ahead = 0; ahead < 10; ahead += 1) {
    for (const edge of sorted) {
      const candidate = day + ahead * DAY_MS + edge * 60000;
      if (candidate <= whenMs) continue;
      const phase = phaseAt(candidate, schedule);
      if (phase !== now) return { atMs: candidate, phase };
    }
  }
  throw new Error("no boundary within nine days");
}

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const pad = (text, width) => String(text).padEnd(width);

/**
 * Prove this file READS `peak_weekdays` instead of hard-coding the weekend.
 *
 * None of the vectors above can prove it. The live rule's non-peak days are
 * Saturday and Sunday, so reading the field and hard-coding the weekend agree
 * at all 168 hours of the week -- an implementation that ignores the field
 * passes every vector, and then bills the wrong day the first time a vendor
 * moves the rule.
 *
 * So: take the synthetic schedule, add Saturday to its peak days, and ask for
 * a Beijing Saturday inside its window. Reading the field flips the answer;
 * hard-coding the weekend does not.
 */
export function configCheck(schedules) {
  const at = parse("2026-08-28T16:30:00Z");     // Beijing Sat 2026-08-29 00:30
  const five = schedules["synthetic-overnight-peak"];
  const six = { ...five, peak_weekdays: [1, 2, 3, 4, 5, 6] };
  return [
    ["peak_weekdays=1-5, Beijing Sat 00:30 -> offpeak", phaseAt(at, five), "offpeak"],
    ["peak_weekdays=1-6, same instant     -> peak", phaseAt(at, six), "peak"],
  ];
}

function main() {
  const url = new URL("./deepseek-peak-offpeak-vectors.json", import.meta.url);
  const doc = JSON.parse(readFileSync(url, "utf8"));
  const schedules = doc.schedules;
  const failed = [];

  for (const v of doc.vectors) {
    const got = phaseAt(parse(v.at_utc), schedules[v.schedule]);
    const ok = got === v.expect;
    console.log(`${ok ? "ok  " : "FAIL"} ${v.at_utc}  ${pad(v.beijing_local, 14)} `
      + `expect ${pad(v.expect, 7)} got ${got}`);
    if (!ok) failed.push(v.at_utc);
  }

  for (const b of doc.next_boundary_vectors) {
    const { atMs, phase } = nextChange(parse(b.from_utc), schedules[b.schedule]);
    const got = iso(atMs);
    const ok = got === b.expect_next_change_utc && phase === b.expect_next_phase;
    console.log(`${ok ? "ok  " : "FAIL"} from ${b.from_utc} -> `
      + `expect ${b.expect_next_change_utc} ${pad(b.expect_next_phase, 7)} `
      + `got ${got} ${phase}`);
    if (!ok) failed.push(b.from_utc);
  }

  const checks = configCheck(schedules);
  for (const [label, got, want] of checks) {
    const ok = got === want;
    console.log(`${ok ? "ok  " : "FAIL"} config  ${label}  got ${got}`);
    if (!ok) failed.push(label);
  }

  const total = doc.vectors.length + doc.next_boundary_vectors.length
    + checks.length;
  console.log(`\n${total - failed.length}/${total} passed`);
  return failed.length > 0 ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());
