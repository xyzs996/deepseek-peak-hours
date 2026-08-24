// Peak/off-peak predicates transcribed from nine published DeepSeek billing
// plugins, so the vectors in ../deepseek-peak-offpeak-vectors.json can be run
// against real code instead of against a description of real code.
//
// Every `phase()` below is a faithful transcription of the named symbol at the
// named commit -- same branches, same operators, same window semantics. Type
// annotations are dropped where the original is TypeScript; nothing else is
// changed. Each is a pure function of an instant plus that project's own
// window configuration, which is what makes this transcription possible at all.
//
// If a transcription is wrong, that is a bug in this file and not a finding
// about anyone's project: open an issue and it will be corrected and re-run.
// Re-check any of them with, e.g.:
//
//   gh api repos/dfkai/dsh-board/contents/src/pricing.ts --jq .content | base64 -d
//
// Licence note: these are short factual transcriptions of published interfaces,
// quoted for interoperability testing. Each project's own licence governs its
// code; nothing here is redistributed as a library.

const HOUR_MS = 3600000;

/** The live vendor schedule, in the shape each project happens to want it. */
const LIVE = {
  beijingHourPairs: [[9, 12], [14, 18]],   // Beijing wall-clock hours
  utcHourPairs: [[1, 4], [6, 10]],         // the same windows, in UTC hours
  utcHhmm: [["01:00", "04:00"], ["06:00", "10:00"]],
};

/**
 * The synthetic schedule's peak window is 16:00-22:00 UTC, i.e. Beijing
 * 00:00-06:00. It exists because the live windows cannot expose a wrong
 * weekday read -- see the note in the vectors file.
 */
const SYNTH = {
  beijingHourPairs: [[0, 6]],
  utcHourPairs: [[16, 22]],
  utcHhmm: [["16:00", "22:00"]],
};

const shapeFor = (scheduleId) =>
  scheduleId === "synthetic-overnight-peak" ? SYNTH
    : scheduleId === "deepseek-live-2026-08-23" ? LIVE
      : null;

/** Beijing hour via Intl, the way two of these projects do it. */
function beijingHourIntl(date) {
  const s = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", hour12: false, timeZone: "Asia/Shanghai",
  }).format(date);
  return Number(s) % 24;
}

const PEAK_ERA = Date.parse("2026-08-16T16:00:00Z"); // peak/off-peak billing begins

export const adapters = [
  {
    id: "dsh-billing-tui",
    repo: "Ethanz11-creat/dsh-billing-tui",
    at: "f853ddf",
    symbol: "lib/peak-detector.js :: isPeakTime",
    lang: "JavaScript",
    windows: "hard-coded",
    // Beijing hour via Intl -- the timezone is handled carefully. The weekday
    // is not read at all, and the file's own comment states the old rule:
    // "官方未对周末/节假日做额外区分,每天同一套时段".
    phase(atMs, scheduleId) {
      if (scheduleId !== "deepseek-live-2026-08-23") return null;
      const hour = beijingHourIntl(new Date(atMs));
      const peak = (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18);
      return peak ? "peak" : "offpeak";
    },
  },
  {
    id: "dsh-whale-meter",
    repo: "Shiye-10Pages/dsh-whale-meter",
    at: "c484500",
    symbol: "src/pricing.ts :: isPeakTime",
    lang: "TypeScript",
    windows: "configurable (UTC hours)",
    // getUTCHours() against PEAK_WINDOWS_UTC = [[1,4],[6,10]]. Correct on
    // hours; no weekday dimension. The tiered-era gate (offPeakActiveAt) sits
    // in the caller and is active for every instant in this vector set.
    phase(atMs, scheduleId) {
      const shape = shapeFor(scheduleId);
      if (shape === null) return null;
      const hour = new Date(atMs).getUTCHours();
      const peak = shape.utcHourPairs.some(([s, e]) => hour >= s && hour < e);
      return peak ? "peak" : "offpeak";
    },
  },
  {
    id: "dsh-token-billing",
    repo: "2006spy/dsh-token-billing",
    at: "91ccbce",
    symbol: "lib/projection.js :: inWindow",
    lang: "JavaScript",
    windows: "configurable (HH:MM + IANA zone)",
    // This one scrapes the vendor page and parses the windows out of it, which
    // is more than anyone else does. The window type is [startMinute,
    // endMinute] with a timezone -- minutes of a day, with no day dimension to
    // put "Monday through Friday" in, so the scraped weekday is dropped.
    phase(atMs, scheduleId) {
      const shape = shapeFor(scheduleId);
      if (shape === null) return null;
      const tz = "UTC"; // DEFAULT_PEAK_WINDOWS are UTC; offPeakTz defaults to 'UTC'
      const d = new Date(atMs);
      const nowMin = tz === "UTC"
        ? d.getUTCHours() * 60 + d.getUTCMinutes()
        : NaN;
      const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
      const peak = shape.utcHhmm.some(([s, e]) => {
        const a = toMin(s), b = toMin(e);
        return a < b ? nowMin >= a && nowMin < b : nowMin >= a || nowMin < b;
      });
      return peak ? "peak" : "offpeak";
    },
  },
  {
    id: "dsh-board",
    repo: "dfkai/dsh-board",
    at: "8f5b962",
    symbol: "src/pricing.ts :: isPeakHour / currentRate",
    lang: "TypeScript",
    windows: "hard-coded",
    // (getUTCHours() + 8) % 24 against Beijing windows: right hour, and the
    // pre-2026-08-17 era gate in currentRate() is right too. No weekday.
    phase(atMs, scheduleId) {
      if (scheduleId !== "deepseek-live-2026-08-23") return null;
      if (atMs < PEAK_ERA) return "peak"; // 'standard' flat era: the full rate
      const hour = (new Date(atMs).getUTCHours() + 8) % 24;
      const peak = (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18);
      return peak ? "peak" : "offpeak";
    },
  },
  {
    id: "dsh-gauge",
    repo: "noone89A/dsh-gauge",
    at: "ca176d7",
    symbol: "src/client/format.ts :: isPeakHour",
    lang: "TypeScript",
    windows: "configurable (Beijing hours)",
    // Beijing hour via Intl, windows passed in. Same shape as dsh-billing-tui:
    // the timezone is handled, the calendar is not.
    phase(atMs, scheduleId) {
      const shape = shapeFor(scheduleId);
      if (shape === null) return null;
      const hour = beijingHourIntl(new Date(atMs));
      const peak = shape.beijingHourPairs.some(([s, e]) => hour >= s && hour < e);
      return peak ? "peak" : "offpeak";
    },
  },
  {
    id: "dsh-calculator",
    repo: "bobcat848/dsh-calculator",
    at: "2787488",
    symbol: "lib/index.js :: isPeak / isBeijingWeekend",
    lang: "JavaScript",
    windows: "hard-coded",
    // Fixed in v1.3.4. Two things worth copying, both of which the earlier
    // transcription had no equivalent of:
    //
    // WEEKEND_OFFPEAK_START_MS is its own constant, separate from
    // PEAK_SCHEDULE_START_MS. A weekend before 2026-08-23 was genuinely billed
    // at peak, so re-costing an older Saturday does not get halved. Most fixes
    // for this reuse the schedule's own start date and quietly rewrite history.
    //
    // isBeijingWeekend takes the day index in the Beijing calendar before
    // taking the weekday, rather than reading getUTCDay() off the unshifted
    // instant -- so it stays right if a window ever moves past 16:00 UTC,
    // which is the only reason the synthetic schedule exists.
    phase(atMs, scheduleId) {
      if (scheduleId !== "deepseek-live-2026-08-23") return null;
      const WEEKEND_OFFPEAK_START_MS = Date.UTC(2026, 7, 22, 16, 0, 0);
      const isBeijingWeekend = (ms) => {
        const day = Math.floor((ms + 8 * HOUR_MS) / 86400000);
        const weekday = (day + 4) % 7; // 0 = Sunday … 6 = Saturday
        return weekday === 0 || weekday === 6;
      };
      if (atMs >= WEEKEND_OFFPEAK_START_MS && isBeijingWeekend(atMs)) return "offpeak";
      const hour = (new Date(atMs).getUTCHours() + 8) % 24;
      const peak = (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18);
      return peak ? "peak" : "offpeak";
    },
  },
  {
    id: "dsh-token-price",
    repo: "spoon-man569/dsh-token-price",
    at: "c39f26f",
    symbol: "src/cost.ts :: isPeakTime",
    lang: "TypeScript",
    windows: "configurable (Beijing hours, fractional)",
    // beijingHour() returns a fractional hour, so half-hour windows would work
    // -- the arithmetic is more general than anyone else's here. The PeakWindow
    // type is {startHour, endHour}: still no day.
    phase(atMs, scheduleId) {
      const shape = shapeFor(scheduleId);
      if (shape === null) return null;
      const hour = (((atMs / HOUR_MS + 8) % 24) + 24) % 24;
      const peak = shape.beijingHourPairs.some(([s, e]) => hour >= s && hour < e);
      return peak ? "peak" : "offpeak";
    },
  },
  {
    id: "dsh-cost-meter",
    repo: "Han-1413141/dsh-cost-meter",
    at: "2b063e1",
    symbol: "lib/pricing.js :: isPeakHour / weekendZoneAt",
    lang: "JavaScript",
    windows: "configurable (UTC hours)",
    // Correct. Shifts by +8h before taking the day index, gates the weekend
    // rule on WEEKEND_OFFPEAK_EFFECTIVE_AT = '2026-08-22T16:00:00Z' (annotated
    // 官方通知), and keeps LEGACY_BASE_BOUNDARY for the pre-peak era.
    phase(atMs, scheduleId) {
      const shape = shapeFor(scheduleId);
      if (shape === null) return null;
      const WEEKEND_FROM = Date.parse("2026-08-22T16:00:00Z");
      const inWeekendZone = (ms) => {
        if (!Number.isFinite(ms) || ms < WEEKEND_FROM) return false;
        const day = Math.floor((ms + 8 * HOUR_MS) / 86400000);
        const weekday = (day + 4) % 7;
        return weekday === 6 || weekday === 0;
      };
      if (inWeekendZone(atMs)) return "offpeak";
      if (atMs < PEAK_ERA) return "offpeak";
      const hour = new Date(atMs).getUTCHours();
      const peak = shape.utcHourPairs.some(([s, e]) =>
        s < e ? hour >= s && hour < e : hour >= s || hour < e);
      return peak ? "peak" : "offpeak";
    },
  },
  {
    id: "dsh-deepseek-balance",
    repo: "lancecheney/dsh-plugins",
    at: "5fc65bf",
    symbol: "packages/dsh-deepseek-balance/lib/index.js :: periodOfUsage",
    lang: "JavaScript",
    windows: "hard-coded",
    // Correct. Shifts by +8h and then reads getUTCDay() off the shifted date,
    // with weekendFrom: "2026-08-23T00:00:00+08:00" carried in the price data.
    phase(atMs, scheduleId) {
      if (scheduleId !== "deepseek-live-2026-08-23") return null;
      const WEEKEND_FROM = Date.parse("2026-08-23T00:00:00+08:00");
      if (atMs < PEAK_ERA) return "peak"; // "flat": the undiscounted rate
      const d = new Date(atMs + 8 * HOUR_MS);
      const day = d.getUTCDay();
      if ((day === 0 || day === 6) && atMs >= WEEKEND_FROM) return "offpeak";
      const hour = d.getUTCHours();
      return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18)
        ? "peak" : "offpeak";
    },
  },
];
